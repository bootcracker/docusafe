import * as AuthSession from "expo-auth-session";

export const useGoogleDriveAuth = async () => {
  const CLIENT_ID =
    "626667828494-72aotalhcjmeot3dljku74htbdb90dkj.apps.googleusercontent.com";
  const REDIRECT_URI = AuthSession.makeRedirectUri();

  const authUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=token&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(
      "https://www.googleapis.com/auth/drive.file"
    )}`;
  const result = await AuthSession.startAsync({authUrl});
  console.log("SS", result);
  if (result.type === "success") {
    return result.params.access_token;
  } else {
    throw new Error("Autenticação cancelada ou falhou");
  }
};
