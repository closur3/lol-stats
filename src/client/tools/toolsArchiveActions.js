export const TOOLS_ARCHIVE_ACTIONS = `
          function deleteArchive(slug, name, button) {
              previewConfigAction('archive-delete', button, { slug: slug, name: name });
          }
`;
