export const TOOLS_ARCHIVE_ACTIONS = `
          function deleteArchive(slug, name, button) {
              if (!requireAuth()) return;
              previewConfigAction('archive-delete', button, { slug: slug, name: name });
          }
`;
