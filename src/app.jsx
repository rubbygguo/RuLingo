import React from "react";
import { createTheme, MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import "./styles.css";

const theme = createTheme({
  primaryColor: "teal",
  fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  headings: {
    fontFamily: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
  },
  radius: {
    default: "8px"
  }
});

export function rootContainer(container) {
  return <MantineProvider theme={theme}>{container}</MantineProvider>;
}
