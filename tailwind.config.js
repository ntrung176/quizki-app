/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          150: '#eaeff5',
          250: '#d6dee9',
          350: '#b2c0d3',
          450: '#7c8ba1',
          455: '#77859b',
          650: '#3d4b5f',
          655: '#3a475a',
          750: '#293548',
          850: '#161f30',
        },
        gray: {
          150: '#eceeed',
          250: '#dadce1',
          255: '#d3d6db',
          350: '#b7bbc5',
          450: '#848a97',
          750: '#2b3544',
          850: '#18202e',
        },
        indigo: {
          305: '#93a0fa',
          550: '#5956ec',
          555: '#5550ea',
          605: '#493fcf',
          650: '#493fcf',
          855: '#342fa0',
        },
        red: {
          650: '#cb2121',
        }
      }
    },
  },
  plugins: [],
}