window.DECENT_CONFIG = {
  version: '2.0.0', appName: 'DecentSubscriptions', subtitle: 'Plans · explicit renewals · expiry',
  chain: null, ens: { enabled: false },
  theme: { accent: '#b3f0a0', 'accent-2': '#edc18e', 'bg-1': '#17251f', 'bg-2': '#26352a', 'bg-3': '#344332' },
  about: { title: 'About DecentSubscriptions', summary: 'Prepaid subscription plans with explicit renewal; no automatic debit.',
    sections: [{ title: 'Synthetic demo and wallet identity', body: 'The local preview uses synthetic actors, assets and a local contract, not real funds. The header wallet remains separate from synthetic actor selection. Real contract actions must pass the configured chain and deployment checks.' },
      { title: 'Prepaid terms and legacy Polygon', body: 'Renewals are explicit purchases; active V1 renewals extend current expiry. Cancellation forfeits access with no refund. The separate legacy Polygon chain 137 contract and ethers v5 ABI are not the V1 deployment. Wallet identity or a historical receipt is not current access authorization; the legacy browser goodies display is not a private-content access service.' },
      { title: 'Storage gates', body: 'Provider selection is independent of subscription records. App backups, community replication and rewards are unavailable until a validated host adapter exists.' }] },
  ipfsAdapter: { version: 1, label: 'Subscription storage gates', capabilities: {},
    getStatus: async () => ({ backup: { state: 'unavailable', detail: 'No subscription backup adapter; no upload or renewal is triggered by these controls.' } }) },
  links: [{ label: 'Project source', url: 'https://github.com/TheJollyLaMa/DecentSubscriptions' }],
};
