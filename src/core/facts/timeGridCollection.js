import { createSchemaIssue, describeSchemaValue } from './schemaIssue.js';
import { getOverviewPageNames } from '../../utils/data/overviewPages.js';

function issue(artifactKey, path, expected, actual) {
  return createSchemaIssue({
    artifactKey,
    path,
    kind: actual == null ? 'missing' : 'invalid',
    expected,
    ...(actual == null ? {} : { actual: describeSchemaValue(actual) })
  });
}

export function readTimeGridCollectionIssue(timeGrid, tournament, artifactKey) {
  const overviewPages = getOverviewPageNames(tournament.overviewPages);
  if (!timeGrid || typeof timeGrid !== 'object' || Array.isArray(timeGrid)) {
    return issue(artifactKey, 'timeGrid', 'fields combined and pages', timeGrid);
  }
  const fields = Object.keys(timeGrid);
  if (fields.length !== 2 || !Object.hasOwn(timeGrid, 'combined') || !Object.hasOwn(timeGrid, 'pages')) {
    return issue(artifactKey, 'timeGrid', 'fields combined and pages', fields.join(', '));
  }
  if (!timeGrid.combined || typeof timeGrid.combined !== 'object' || Array.isArray(timeGrid.combined)) {
    return issue(artifactKey, 'timeGrid.combined', 'object', timeGrid.combined);
  }
  if (!Array.isArray(timeGrid.pages) || timeGrid.pages.length !== overviewPages.length) {
    return issue(artifactKey, 'timeGrid.pages', 'one entry per overviewPage', timeGrid.pages);
  }
  for (const [index, page] of timeGrid.pages.entries()) {
    if (!page || typeof page !== 'object' || Array.isArray(page) || Object.keys(page).length !== 2 || typeof page.overviewPage !== 'string' || !Object.hasOwn(page, 'timeGrid')) {
      return issue(artifactKey, `timeGrid.pages[${index}]`, 'fields overviewPage and timeGrid', page);
    }
    if (page.overviewPage !== overviewPages[index]) {
      return issue(artifactKey, `timeGrid.pages[${index}].overviewPage`, overviewPages[index], page.overviewPage);
    }
    if (!page.timeGrid || typeof page.timeGrid !== 'object' || Array.isArray(page.timeGrid)) {
      return issue(artifactKey, `timeGrid.pages[${index}].timeGrid`, 'object', page.timeGrid);
    }
  }
  return null;
}
