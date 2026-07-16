function compareTimeGroups(leftGroup, rightGroup) {
  return leftGroup.matchDateStr.localeCompare(rightGroup.matchDateStr)
    || leftGroup.actualCenter - rightGroup.actualCenter
    || leftGroup.roundedMinutes - rightGroup.roundedMinutes;
}

function compareTimelineGroups(leftGroup, rightGroup) {
  return leftGroup.clusterCenter - rightGroup.clusterCenter
    || leftGroup.matchDateStr.localeCompare(rightGroup.matchDateStr)
    || leftGroup.roundedMinutes - rightGroup.roundedMinutes;
}

function readTimelineStart(timeGroups) {
  const minutes = [...new Set(timeGroups.map(group => group.actualCenter))].sort((left, right) => left - right);
  if (minutes.length === 1) return minutes[0];

  let largestGap = -1;
  let timelineStart = minutes[0];
  for (let index = 0; index < minutes.length; index++) {
    const current = minutes[index];
    const next = index === minutes.length - 1 ? minutes[0] + 24 * 60 : minutes[index + 1];
    const gap = next - current;
    const candidateStart = next % (24 * 60);
    if (gap > largestGap || (gap === largestGap && candidateStart < timelineStart)) {
      largestGap = gap;
      timelineStart = candidateStart;
    }
  }
  return timelineStart;
}

function unwrapTimeGroups(timeGroups) {
  const timelineStart = readTimelineStart(timeGroups);
  return timeGroups.map(group => ({
    ...group,
    clusterCenter: group.actualCenter < timelineStart ? group.actualCenter + 24 * 60 : group.actualCenter
  }));
}

function buildTimeGroups(matches) {
  const groupsByKey = new Map();
  for (const match of matches) {
    if (typeof match.sessionKey !== "string" || match.sessionKey === "") {
      throw new Error("Time Grid match sessionKey missing");
    }
    const key = `${match.sessionKey}\u001f${match.matchDateStr}\u001f${match.roundedMinutes}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        sessionKey: match.sessionKey,
        matchDateStr: match.matchDateStr,
        roundedMinutes: match.roundedMinutes,
        timeMinutesTotal: 0,
        matches: []
      };
      groupsByKey.set(key, group);
    }
    group.timeMinutesTotal += match.timeMinutes;
    group.matches.push(match);
  }

  return [...groupsByKey.values()]
    .map(group => ({
      sessionKey: group.sessionKey,
      matchDateStr: group.matchDateStr,
      roundedMinutes: group.roundedMinutes,
      actualCenter: group.timeMinutesTotal / group.matches.length,
      matches: group.matches
    }))
    .sort((leftGroup, rightGroup) => (
      leftGroup.sessionKey.localeCompare(rightGroup.sessionKey)
      || compareTimeGroups(leftGroup, rightGroup)
    ));
}

function groupBySession(timeGroups) {
  const groupsBySession = new Map();
  for (const timeGroup of timeGroups) {
    const sessionGroups = groupsBySession.get(timeGroup.sessionKey);
    if (sessionGroups) sessionGroups.push(timeGroup);
    else groupsBySession.set(timeGroup.sessionKey, [timeGroup]);
  }
  for (const sessionGroups of groupsBySession.values()) sessionGroups.sort(compareTimelineGroups);
  return groupsBySession;
}

function readSlotCount(groupsBySession) {
  let slotCount = 0;
  for (const sessionGroups of groupsBySession.values()) {
    slotCount = Math.max(slotCount, sessionGroups.length);
  }
  return slotCount;
}

function compareIndexes(leftIndexes, rightIndexes) {
  for (let index = 0; index < leftIndexes.length; index++) {
    if (leftIndexes[index] !== rightIndexes[index]) return leftIndexes[index] - rightIndexes[index];
  }
  return 0;
}

function assignSessionGroups(sessionGroups, centers) {
  const memo = new Map();

  function choose(groupIndex, firstCenterIndex) {
    if (groupIndex === sessionGroups.length) return { cost: 0, indexes: [] };
    const key = `${groupIndex}.${firstCenterIndex}`;
    if (memo.has(key)) return memo.get(key);

    const remainingGroups = sessionGroups.length - groupIndex;
    const lastCenterIndex = centers.length - remainingGroups;
    let best = null;
    for (let centerIndex = firstCenterIndex; centerIndex <= lastCenterIndex; centerIndex++) {
      const tail = choose(groupIndex + 1, centerIndex + 1);
      const group = sessionGroups[groupIndex];
      const cost = tail.cost + Math.abs(group.clusterCenter - centers[centerIndex]) * group.matches.length;
      const candidate = { cost, indexes: [centerIndex, ...tail.indexes] };
      if (!best || cost < best.cost || (cost === best.cost && compareIndexes(candidate.indexes, best.indexes) < 0)) {
        best = candidate;
      }
    }
    if (!best) throw new Error(`Time slot assignment missing for session ${sessionGroups[0].sessionKey}`);
    memo.set(key, best);
    return best;
  }

  return choose(0, 0);
}

function assignGroups(groupsBySession, centers) {
  const assignmentByGroup = new Map();
  let cost = 0;
  for (const sessionGroups of groupsBySession.values()) {
    const assignment = assignSessionGroups(sessionGroups, centers);
    cost += assignment.cost;
    sessionGroups.forEach((group, index) => assignmentByGroup.set(group, assignment.indexes[index]));
  }
  return { assignmentByGroup, cost };
}

function recenterGroups(timeGroups, assignmentByGroup, slotCount) {
  const totals = Array(slotCount).fill(0);
  const weights = Array(slotCount).fill(0);
  for (const timeGroup of timeGroups) {
    const clusterIndex = assignmentByGroup.get(timeGroup);
    if (clusterIndex == null) throw new Error(`Time group assignment missing: ${timeGroup.sessionKey}`);
    const weight = timeGroup.matches.length;
    totals[clusterIndex] += timeGroup.clusterCenter * weight;
    weights[clusterIndex] += weight;
  }
  return totals.map((total, index) => {
    if (weights[index] === 0) throw new Error(`Time slot cluster ${index} has no assigned groups`);
    return total / weights[index];
  });
}

function assignmentSignature(timeGroups, assignmentByGroup) {
  return timeGroups.map(timeGroup => assignmentByGroup.get(timeGroup)).join(",");
}

function optimizeClusters(timeGroups, groupsBySession, initialCenters) {
  let centers = [...initialCenters].sort((left, right) => left - right);
  let previousSignature = null;

  for (let iteration = 0; iteration < 100; iteration++) {
    const { assignmentByGroup } = assignGroups(groupsBySession, centers);
    const signature = assignmentSignature(timeGroups, assignmentByGroup);
    if (signature === previousSignature) {
      const result = assignGroups(groupsBySession, centers);
      return { centers, ...result };
    }
    previousSignature = signature;
    centers = recenterGroups(timeGroups, assignmentByGroup, centers.length);
  }
  throw new Error("Time slot clustering did not converge");
}

function buildInitialCenters(groupsBySession, slotCount) {
  const candidates = [];
  const signatures = new Set();
  const rankTotals = Array(slotCount).fill(0);
  const rankWeights = Array(slotCount).fill(0);

  for (const sessionGroups of groupsBySession.values()) {
    if (sessionGroups.length !== slotCount) continue;
    const centers = sessionGroups.map(group => group.clusterCenter);
    const signature = centers.join(",");
    if (!signatures.has(signature)) {
      signatures.add(signature);
      candidates.push(centers);
    }
    sessionGroups.forEach((group, index) => {
      const weight = group.matches.length;
      rankTotals[index] += group.clusterCenter * weight;
      rankWeights[index] += weight;
    });
  }

  const rankCenters = rankTotals.map((total, index) => total / rankWeights[index]);
  const rankSignature = rankCenters.join(",");
  if (!signatures.has(rankSignature)) candidates.push(rankCenters);
  return candidates;
}

function chooseBestClusters(timeGroups, groupsBySession, slotCount) {
  let best = null;
  for (const initialCenters of buildInitialCenters(groupsBySession, slotCount)) {
    const candidate = optimizeClusters(timeGroups, groupsBySession, initialCenters);
    const centerSignature = candidate.centers.join(",");
    const bestCenterSignature = best?.centers.join(",");
    if (!best || candidate.cost < best.cost || (candidate.cost === best.cost && centerSignature < bestCenterSignature)) {
      best = candidate;
    }
  }
  if (!best) throw new Error("Time slot cluster seed missing");
  return best;
}

function labelClusters(timeGroups, assignmentByGroup, slotCount) {
  const countsByCluster = Array.from({ length: slotCount }, () => new Map());
  for (const timeGroup of timeGroups) {
    const clusterIndex = assignmentByGroup.get(timeGroup);
    if (clusterIndex == null) throw new Error(`Time group assignment missing: ${timeGroup.sessionKey}`);
    const counts = countsByCluster[clusterIndex];
    counts.set(timeGroup.roundedMinutes, (counts.get(timeGroup.roundedMinutes) ?? 0) + timeGroup.matches.length);
  }

  const clusters = countsByCluster.map(counts => {
    let peakMinutes = null;
    let peakCount = -1;
    for (const [roundedMinutes, count] of counts) {
      if (count > peakCount || (count === peakCount && (peakMinutes == null || roundedMinutes < peakMinutes))) {
        peakMinutes = roundedMinutes;
        peakCount = count;
      }
    }
    if (peakMinutes == null) throw new Error("Time slot cluster has no assigned groups");
    return { label: String(Math.floor(peakMinutes / 60)) };
  });
  const labels = new Set(clusters.map(cluster => cluster.label));
  if (labels.size !== clusters.length) throw new Error("Time slot cluster labels must be unique");
  return clusters;
}

function mapMatchesToClusters(timeGroups, assignmentByGroup) {
  const assignmentByMatch = new Map();
  for (const timeGroup of timeGroups) {
    const clusterIndex = assignmentByGroup.get(timeGroup);
    if (clusterIndex == null) throw new Error(`Time group assignment missing: ${timeGroup.sessionKey}`);
    for (const match of timeGroup.matches) assignmentByMatch.set(match, clusterIndex);
  }
  return assignmentByMatch;
}

export function buildTimeSlotLayout(matches) {
  if (!Array.isArray(matches)) throw new Error("matches must be an array");
  if (matches.length === 0) return { clusters: [], assignmentByMatch: new Map() };

  const timeGroups = unwrapTimeGroups(buildTimeGroups(matches));
  const groupsBySession = groupBySession(timeGroups);
  const slotCount = readSlotCount(groupsBySession);
  const { assignmentByGroup } = chooseBestClusters(timeGroups, groupsBySession, slotCount);
  return {
    clusters: labelClusters(timeGroups, assignmentByGroup, slotCount),
    assignmentByMatch: mapMatchesToClusters(timeGroups, assignmentByGroup)
  };
}
