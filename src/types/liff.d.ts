export {};

declare global {
  interface Window {
    liff?: {
      init: (config: { liffId: string }) => Promise<void>;
      isLoggedIn: () => boolean;
      login: (options?: { redirectUri?: string }) => void;
      logout: () => void;
      getIDToken: () => string | null;
      getDecodedIDToken?: () => {
        sub?: string;
        name?: string;
        picture?: string;
        email?: string;
      } | null;
      getProfile: () => Promise<{
        userId: string;
        displayName: string;
        pictureUrl?: string;
        statusMessage?: string;
      }>;
      isInClient?: () => boolean;
    };
  }
}
