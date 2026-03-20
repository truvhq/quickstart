import { readFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const { API_PRODUCT_TYPE } = process.env;
const validProductTypes = ['employment', 'income', 'admin', 'pll', 'deposit_switch'];

if (validProductTypes.indexOf(API_PRODUCT_TYPE) < 0) {
  console.error('Not a Valid Product Type. Please specify an API_PRODUCT_TYPE of the following:');
  console.error(validProductTypes);
  process.exit(-1);
}

const html = readFileSync(`../html/${API_PRODUCT_TYPE}.html`)
  .toString()
  .replace('{{ product_type }}', API_PRODUCT_TYPE);

export default (req, res) => {
  // return the HTML based on what product type is specified
  res.send(html.replace('{{ server_url }}', `http://${req.headers.host}/`));
};
