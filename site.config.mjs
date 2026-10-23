export const repository = 'Fermi-DEX/fermi-trade-documentation';
export const domain = process.env.DOCS_DOMAIN || 'docs.fermi.trade';

const group = (label, slugs) => ({ label, items: slugs.map((slug) => ({ slug })) });
export const navigation = [
  { label: 'Documentation', link: '/' },
  group('Start here', ['overview', 'architecture', 'getting-started', 'glossary']),
  group('Accounts & collateral', ['accounts', 'collateral']),
  group('Markets', ['market-specs', 'pricing-mark-price', 'funding']),
  group('Trading', ['fifo-orderbook', 'matching-engine', 'order-types', 'self-trade-prevention', 'fees']),
  group('Risk & PnL', ['margin-and-health', 'entry-pnl', 'liquidation', 'bankruptcy-insurance', 'risk-warning']),
  group('Execution & sequencing', ['execution-queue', 'direct-fallback', 'posq-sequencing', 'harness-and-latency']),
  group('FLP vault', ['flp-vault', 'flp-accounting', 'flp-lifecycle', 'flp-recovery', 'flp-integration']),
  group('Security & operations', ['security-and-invariants', 'source-and-review', 'operations']),
  group('Integrate', ['trader-workflow', 'sdk', 'direct-cpi', 'api-http', 'api-grpc', 'streams']),
  group('Help', ['faq', 'support']),
  { label: 'Edit documentation', link: '/admin/' },
];
