// Simple replacement for the json2csv module which was a big chunk of the final bundle size
export function simplejson2csv(data, fields) {
    const escape = (val) => '"' + String(val).replace(/"/g, '""') + '"';

    let csv = fields.map(f => escape(f.label)).join(',');
    for(let row of data) {
        let rowData = [];
        for(let field of fields) {
            rowData.push(escape(field.value(row)));
        }

        csv += '\r\n' + rowData.join(',');
    }

    return csv;
}