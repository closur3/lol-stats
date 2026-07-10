export const toolsArchiveActions = `
          function deleteArchive(slug, name, button) {
              previewConfigAction('archive-delete', button, { slug: slug, name: name });
          }
`;
