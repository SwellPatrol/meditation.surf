/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

import { ResizeMode, Video } from "expo-av";
import React, { useRef } from "react";
import { Image, StyleSheet, View } from "react-native";

export default function HomeScreen(): JSX.Element {
  const videoRef: React.RefObject<Video> = useRef<Video>(null);

  return (
    <View style={styles.container}>
      <Image source={require("@/assets/images/icon.png")} style={styles.icon} />
      <Video
        ref={videoRef}
        style={styles.video}
        source={{
          uri: "https://stream.mux.com/7YtWnCpXIt014uMcBK65ZjGfnScdcAneU9TjM9nGAJhk.m3u8",
        }}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isLooping
        useNativeControls={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    position: "absolute",
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },
  video: StyleSheet.absoluteFillObject,
});
