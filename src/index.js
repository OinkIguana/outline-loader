import validateOptions from 'schema-utils';
import { getOptions } from 'loader-utils';
import path from 'path';
import fs from 'fs';
import toml from 'toml';
const outline = import('@oinkiguana/outline');

const schema = {
  type: 'object',
  properties: {
    config: { type: 'string' },
    style: { type: 'string' },
    language: { type: 'string' },
    entrypoint: { type: 'string' },
  },
  additionalProperties: false,
};

function resolveStyle(...styles) {
  const validStyle = style => (['md', 'tex', 'bird', 'html'].includes(style) ? style : null);
  return styles.reduce((r, style) => r || validStyle(style), null);
}

function resolveLanguage(...languages) {
  return languages.find(lang => !!lang);
}

export default function loader(source) {
  const callback = this.async();
  try {
    const options = getOptions(this) || {};
    validateOptions(schema, options, 'Outline Loader');

    const configFile = path.resolve(options.config || 'Outline.toml');
    this.addDependency(configFile);

    let config = {};
    if (fs.existsSync(configFile)) {
      config = toml.parse(fs.readFileSync(configFile));
    } else if (options.config) {
      throw new Error(`Config file '${options.config}' could not be found at '${configFile}'`);
    }

    const { resourcePath } = this;
    const style = resolveStyle(options.style, path.extname(resourcePath).slice(1), 'md');
    const language = resolveLanguage(options.language, path.extname(path.basename(resourcePath, path.extname(resourcePath))).slice(1), 'js');

    outline.then(outline => {
      let parser;
      switch (style) {
        case 'md':
          parser = new outline.MdParser();
          break;
        case 'tex':
          parser = new outline.TexParser();
          break;
        case 'html':
          parser = new outline.HtmlParser();
          break;
        case 'bird':
          parser = new outline.BirdParser();
          break;
        default:
          return callback(Error(`Unsupported style ${style}`));
      }
      callback(null, parser.tangle(source, options.entrypoint || null, language));
    });
  } catch (error) {
    callback(error);
  }
}
