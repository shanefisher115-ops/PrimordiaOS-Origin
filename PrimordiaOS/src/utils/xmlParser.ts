import { parseStringPromise } from 'xml2js';

export const XmlParser = {
  async parse(xml: string): Promise<any> {
    return await parseStringPromise(xml);
  },
};
