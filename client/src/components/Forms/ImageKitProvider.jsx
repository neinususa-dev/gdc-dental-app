// src/components/ImageKitProvider.jsx
import React from "react";
import { IKContext } from "imagekitio-react";

const urlEndpoint = import.meta.env.VITE_IK_URL_ENDPOINT;
const publicKey   = import.meta.env.VITE_IK_PUBLIC_KEY;
const authEndpoint = import.meta.env.VITE_IK_AUTH_ENDPOINT;

/**
 * Wrap your app (or the page that uses uploads) with this provider.
 * Requires a server route at /api/imagekit/auth that returns { signature, expire, token }.
 */
const ImageKitProvider = ({ children }) => {
  if (!urlEndpoint || !publicKey) {
    // Fail-safe guard for missing env vars
    console.warn(
      "[ImageKit] Missing VITE_IK_URL_ENDPOINT or VITE_IK_PUBLIC_KEY"
    );
  }

  return (
    <IKContext
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticationEndpoint={authEndpoint}
    >
      {children}
    </IKContext>
  );
};

export default ImageKitProvider;
