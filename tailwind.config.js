module.exports = {
  content: [
    "./templates/**/*.html",
    "./static/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        // Define your custom colors here
        'custom-base-100': '#fdfcfb',
        'custom-base-200': '#F2F2F2',
        'custom-base-300': '#E5E5E5',
        'custom-accent': '#FF4081',
        'custom-primary': '#3F51B5',
        'custom-secondary': '#00BCD4',
        'custom-neutral': '#9E9E9E',
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        pastel: {
          ...require("daisyui/src/theming/themes")["[data-theme=pastel]"],
          "base-100": "#fafafa", // lightest, for backgrounds
          "base-200": "#f3f4f6", // slightly darker, for borders and menu bg
          "base-300": "#e5e7eb", // more dark, for highlighted sections
          "accent": "#E7D5E6", // Purplish.
          "primary": "#82cdd1", // Greenish-blue. Main button color.
          "secondary": "#f1776e", // Logo Red.
          "neutral": "#9E9E9E", // not really sure what to do with this one yet.
        },
      },
      {
        dark: {
          ...require("daisyui/src/theming/themes")["[data-theme=dark]"],
          "base-100": "#1A1A1A",
          "base-200": "#2A2A2A",
          "base-300": "#3A3A3A",
          "accent": "#FF4081",
          "primary": "#BB86FC",
          "secondary": "#03DAC6",
          "neutral": "#BDBDBD",
        },
      },
    ],
  },
}