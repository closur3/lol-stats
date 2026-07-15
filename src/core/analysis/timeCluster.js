const clusterMergeThresholdMinutes = 60;

function buildTimeGroups(matches) {
  const groupsByKey = new Map();
  for (const match of matches) {
    const key = `${match.matchDateStr}\u001f${match.roundedMinutes}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
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
      matchDateStr: group.matchDateStr,
      roundedMinutes: group.roundedMinutes,
      actualCenter: group.timeMinutesTotal / group.matches.length,
      matches: group.matches
    }))
    .sort((leftGroup, rightGroup) => (
      leftGroup.matchDateStr.localeCompare(rightGroup.matchDateStr)
      || leftGroup.roundedMinutes - rightGroup.roundedMinutes
      || leftGroup.actualCenter - rightGroup.actualCenter
    ));
}

function readMaxGroupsPerDay(timeGroups) {
  const countsByDate = new Map();
  for (const timeGroup of timeGroups) {
    countsByDate.set(timeGroup.matchDateStr, (countsByDate.get(timeGroup.matchDateStr) ?? 0) + 1);
  }
  return Math.max(...countsByDate.values(), 0);
}

function createTimeSlotClusters(timeGroups, maxClusters) {
  if (maxClusters === 0) return [];

  const roundedTimes = [...new Set(timeGroups.map(timeGroup => timeGroup.roundedMinutes))]
    .sort((leftTime, rightTime) => leftTime - rightTime);

  if (roundedTimes.length <= maxClusters) {
    return roundedTimes.map(roundedTime => ({ actualCenter: roundedTime }));
  }

  const clusters = [];
  let currentCluster = { actualCenter: roundedTimes[0], times: [roundedTimes[0]] };

  for (let timeIndex = 1; timeIndex < roundedTimes.length; timeIndex++) {
    const roundedTime = roundedTimes[timeIndex];
    const distance = Math.abs(roundedTime - currentCluster.actualCenter);
    if (distance <= clusterMergeThresholdMinutes && clusters.length + 1 < maxClusters) {
      currentCluster.times.push(roundedTime);
      currentCluster.actualCenter = Math.round(
        currentCluster.times.reduce((sum, clusterTime) => sum + clusterTime, 0) / currentCluster.times.length
      );
    } else {
      clusters.push(currentCluster);
      currentCluster = { actualCenter: roundedTime, times: [roundedTime] };
    }
  }
  clusters.push(currentCluster);

  while (clusters.length > maxClusters) {
    let nearestDistance = Infinity;
    let nearestIndex = -1;
    for (let clusterIndex = 0; clusterIndex < clusters.length - 1; clusterIndex++) {
      const distance = clusters[clusterIndex + 1].actualCenter - clusters[clusterIndex].actualCenter;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = clusterIndex;
      }
    }
    if (nearestIndex < 0) throw new Error("Nearest time slot cluster missing");

    const mergedTimes = [...clusters[nearestIndex].times, ...clusters[nearestIndex + 1].times];
    clusters.splice(nearestIndex, 2, {
      actualCenter: Math.round(mergedTimes.reduce((sum, clusterTime) => sum + clusterTime, 0) / mergedTimes.length),
      times: mergedTimes
    });
  }

  return clusters.map(cluster => ({ actualCenter: cluster.actualCenter }));
}

function assignTimeGroupsToClusters(timeGroups, clusters) {
  const assignmentByGroup = new Map();
  const groupsByDate = new Map();
  for (const timeGroup of timeGroups) {
    const dailyGroups = groupsByDate.get(timeGroup.matchDateStr);
    if (dailyGroups) dailyGroups.push(timeGroup);
    else groupsByDate.set(timeGroup.matchDateStr, [timeGroup]);
  }

  for (const [matchDateStr, dailyGroups] of groupsByDate) {
    const usedClusterIndexes = new Set();
    for (const timeGroup of dailyGroups) {
      let chosenClusterIndex = -1;
      let chosenDistance = Infinity;
      let chosenCenter = Infinity;

      for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
        if (usedClusterIndexes.has(clusterIndex)) continue;
        const center = clusters[clusterIndex].actualCenter;
        const distance = Math.abs(timeGroup.actualCenter - center);
        if (distance < chosenDistance || (distance === chosenDistance && center < chosenCenter)) {
          chosenClusterIndex = clusterIndex;
          chosenDistance = distance;
          chosenCenter = center;
        }
      }

      if (chosenClusterIndex < 0) {
        throw new Error(`No available time slot for time group on ${matchDateStr}. dailyGroups=${dailyGroups.length}, clusters=${clusters.length}`);
      }
      usedClusterIndexes.add(chosenClusterIndex);
      assignmentByGroup.set(timeGroup, chosenClusterIndex);
    }
  }

  return assignmentByGroup;
}

function labelTimeSlotClusters(timeGroups, assignmentByGroup, clusters) {
  const countsByCluster = clusters.map(() => new Map());
  for (const timeGroup of timeGroups) {
    const clusterIndex = assignmentByGroup.get(timeGroup);
    if (clusterIndex == null) throw new Error(`Time group assignment missing: ${timeGroup.matchDateStr}.${timeGroup.roundedMinutes}`);
    const counts = countsByCluster[clusterIndex];
    counts.set(timeGroup.roundedMinutes, (counts.get(timeGroup.roundedMinutes) ?? 0) + timeGroup.matches.length);
  }

  const labeledClusters = countsByCluster.map((counts) => {
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
  const labels = new Set(labeledClusters.map(cluster => cluster.label));
  if (labels.size !== labeledClusters.length) throw new Error("Time slot cluster labels must be unique");
  return labeledClusters;
}

function mapMatchesToClusters(timeGroups, assignmentByGroup) {
  const assignmentByMatch = new Map();
  for (const timeGroup of timeGroups) {
    const clusterIndex = assignmentByGroup.get(timeGroup);
    if (clusterIndex == null) throw new Error(`Time group assignment missing: ${timeGroup.matchDateStr}.${timeGroup.roundedMinutes}`);
    for (const match of timeGroup.matches) assignmentByMatch.set(match, clusterIndex);
  }
  return assignmentByMatch;
}

export function buildTimeSlotLayout(matches) {
  if (!Array.isArray(matches)) throw new Error("matches must be an array");
  const timeGroups = buildTimeGroups(matches);
  const maxGroupsPerDay = readMaxGroupsPerDay(timeGroups);
  const clusters = createTimeSlotClusters(timeGroups, maxGroupsPerDay);
  const assignmentByGroup = assignTimeGroupsToClusters(timeGroups, clusters);
  return {
    clusters: labelTimeSlotClusters(timeGroups, assignmentByGroup, clusters),
    assignmentByMatch: mapMatchesToClusters(timeGroups, assignmentByGroup)
  };
}
