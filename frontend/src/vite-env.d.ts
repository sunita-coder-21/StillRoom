/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK?: 'preview' | 'preprod';
  readonly VITE_INDEXER_URL?: string;
  readonly VITE_INDEXER_WS?: string;
  readonly VITE_CONTRACT_ADDRESS?: string;
  readonly VITE_PROOF_SERVER_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
