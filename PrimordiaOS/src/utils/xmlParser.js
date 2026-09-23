import { parseStringPromise } from 'xml2js';
export const XmlParser = {
    async parse(xml) {
        return await parseStringPromise(xml);
    },
};
