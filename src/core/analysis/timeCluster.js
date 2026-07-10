export function clusterTimeSlots(finishedMatches, maxClusters) {
  const timeSet = new Set();
  for (const finishedMatch of finishedMatches) {
    timeSet.add(finishedMatch.roundedMinutes);
  }
  const sortedTimes = Array.from(timeSet).sort((leftTime, rightTime) => leftTime - rightTime);

  if (sortedTimes.length <= maxClusters) {
    return sortedTimes.map(roundedTime => ({
      actualCenter: roundedTime,
      centerMinutes: roundedTime,
      peakMinutes: null,
      label: String(Math.floor(roundedTime / 60)),
      matches: []
    }));
  }

  const threshold = 60;
  const clusters = [];
  let currentCluster = { centerMinutes: sortedTimes[0], times: [sortedTimes[0]] };

  for (let timeIndex = 1; timeIndex < sortedTimes.length; timeIndex++) {
    const roundedTime = sortedTimes[timeIndex];
    const distance = Math.abs(roundedTime - currentCluster.centerMinutes);
    if (distance <= threshold && clusters.length + 1 < maxClusters) {
      currentCluster.times.push(roundedTime);
      currentCluster.centerMinutes = Math.round(currentCluster.times.reduce((sum, clusterTime) => sum + clusterTime, 0) / currentCluster.times.length);
    } else {
      clusters.push(currentCluster);
      currentCluster = { centerMinutes: roundedTime, times: [roundedTime] };
    }
  }
  clusters.push(currentCluster);

  while (clusters.length > maxClusters) {
    let nearestClusterDistance = Infinity, nearestClusterIndex = 0;
    for (let clusterIndex = 0; clusterIndex < clusters.length - 1; clusterIndex++) {
      const distance = clusters[clusterIndex + 1].centerMinutes - clusters[clusterIndex].centerMinutes;
      if (distance < nearestClusterDistance) { nearestClusterDistance = distance; nearestClusterIndex = clusterIndex; }
    }
    const merged = {
      centerMinutes: Math.round((clusters[nearestClusterIndex].centerMinutes + clusters[nearestClusterIndex + 1].centerMinutes) / 2),
      times: [...clusters[nearestClusterIndex].times, ...clusters[nearestClusterIndex + 1].times]
    };
    clusters.splice(nearestClusterIndex, 2, merged);
  }

  return clusters.map(timeCluster => {
    const clusterHour = Math.round(timeCluster.centerMinutes / 60) % 24;
    return {
      actualCenter: timeCluster.centerMinutes,
      centerMinutes: clusterHour * 60,
      peakMinutes: null,
      label: String(clusterHour),
      matches: []
    };
  });
}

export function assignMatchesToClusters(finishedMatches, clusters) {
  for (const finishedMatch of finishedMatches) {
    let nearestCluster = 0, nearestDistance = Infinity;
    for (let clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
      const distance = Math.abs(finishedMatch.timeMinutes - clusters[clusterIndex].actualCenter);
      if (distance < nearestDistance) { nearestDistance = distance; nearestCluster = clusterIndex; }
    }
    clusters[nearestCluster].matches.push(finishedMatch);
  }

  for (const timeCluster of clusters) {
    if (timeCluster.matches.length === 0) continue;
    const countMap = {};
    for (const finishedMatch of timeCluster.matches) {
      countMap[finishedMatch.roundedMinutes] = (countMap[finishedMatch.roundedMinutes] || 0) + 1;
    }
    let peakMinutes = timeCluster.matches[0].roundedMinutes, maxCount = 0;
    for (const [roundedMinutes, occurrenceCount] of Object.entries(countMap)) {
      if (occurrenceCount > maxCount) { maxCount = occurrenceCount; peakMinutes = Number.parseInt(roundedMinutes, 10); }
    }
    timeCluster.peakMinutes = peakMinutes;
    timeCluster.label = String(Math.floor(peakMinutes / 60));
  }
}
