import { Stack } from "expo-router";
import React from "react";

export default function RootLayout(): JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}
