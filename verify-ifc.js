const fs = require('fs');
const path = require('path');
const WebIFC = require('web-ifc');

(async () => {
  const file = process.argv[2] || path.join(__dirname, 'sample', 'sample.ifc');
  const ifc = new WebIFC.IfcAPI();
  await ifc.Init();
  const data = new Uint8Array(fs.readFileSync(file));
  const model = ifc.OpenModel(data);
  console.log('parsed OK, model id:', model);
  const walls = ifc.GetLineIDsWithType(model, WebIFC.IFCWALL);
  console.log('IfcWall count:', walls.size());
  const meshes = ifc.LoadAllGeometry(model);
  console.log('geometry meshes:', meshes.size());
  if (meshes.size() > 0) {
    console.log('first mesh expressID:', meshes.get(0).expressID);
  }
  ifc.CloseModel(model);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
