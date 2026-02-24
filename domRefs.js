// DOM 参照の保持（main で setRefs してから他モジュールで参照）
const refs = {};
export function setRefs(r) {
  Object.assign(refs, r);
}
export function getRefs() {
  return refs;
}
