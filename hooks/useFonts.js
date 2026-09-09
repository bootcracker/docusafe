"use client";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts as useExpoFonts,
} from "@expo-google-fonts/poppins";
import {useEffect, useState} from "react";

export const useFonts = () => {
  const [fontsLoaded] = useExpoFonts({
    "Poppins-Regular": Poppins_400Regular,
    "Poppins-Medium": Poppins_500Medium,
    "Poppins-SemiBold": Poppins_600SemiBold,
    "Poppins-Bold": Poppins_700Bold,
  });

  const [timeoutReached, setTimeoutReached] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!fontsLoaded) {
        console.log("Timeout: usando fontes do sistema");
        setTimeoutReached(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  return fontsLoaded || timeoutReached;
};
