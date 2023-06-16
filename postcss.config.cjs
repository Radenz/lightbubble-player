// eslint-disable-next-line @typescript-eslint/no-var-requires
const tailwindcss = require('tailwindcss');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const autoprefixer = require('autoprefixer');

const config = {
  plugins: {
    'tailwindcss/nesting': {},
    //Some plugins, like tailwindcss/nesting, need to run before Tailwind,
    // tailwindcss(),
    tailwindcss,
    //But others, like autoprefixer, need to run after,
    autoprefixer
  }
};

module.exports = config;
