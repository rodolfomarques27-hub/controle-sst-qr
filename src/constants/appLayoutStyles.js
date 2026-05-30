export const estilosGlobais = `
  .scrollbar-discreta {
    scrollbar-width: thin;
    scrollbar-color: #e2e8f0 transparent;
    scrollbar-gutter: stable;
  }

  .scrollbar-discreta::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  .scrollbar-discreta::-webkit-scrollbar-track {
    background: transparent;
    margin: 18px 0;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 999px;
  }

  .scrollbar-discreta::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }
`;
