/* Shared scene intent, kept through planning, corrections and project snapshots. */
(function(root){
'use strict';
const kinds=['specific_person','specific_place','specific_event','document','generic_illustration','data','explanatory_card'];
function normalize(scene){
 const declared=scene.evidenceKind;
 if(declared&&!kinds.includes(declared))throw Error('نوع المادة البصرية غير صالح');
 const kind=declared||(scene.visualType==='portrait'?'specific_person':scene.visualType==='document'||scene.creative?.kind==='document-focus'?'document':scene.visualType==='data'?'data':scene.visualType==='text-only'?'explanatory_card':['real','archive'].includes(scene.visualType)?'specific_event':'generic_illustration');
 return {version:1,kind,subjects:Array.isArray(scene.subjects)?scene.subjects.filter(x=>typeof x==='string').map(x=>x.slice(0,100)).slice(0,6):[],queries:[...new Set([scene.visualQuery,...(Array.isArray(scene.searchQueries)?scene.searchQueries:[])].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim().slice(0,180)))].slice(0,3),allowedSources:['specific_person','specific_place','specific_event','document'].includes(kind)?['library','commons']:kind==='generic_illustration'?['library','pexels','commons']:['local'],fallbackPolicy:['data','explanatory_card'].includes(kind)?'intentional-graphics':'matched-media-only'};
}
function apply(scene){const contract=normalize(scene);scene.visualIntent=contract;scene.evidenceKind=contract.kind;
 if(contract.kind==='specific_person')scene.requestedVisualType=scene.visualType='portrait';
 if(contract.kind==='document')scene.requestedVisualType=scene.visualType='document';
 if(contract.kind==='explanatory_card'){scene.requestedVisualType=scene.visualType='text-only';scene.explicitGraphics=false;delete scene.illustration;}
 return contract;
}
root.StudioSceneContract={kinds,normalize,apply};
})(typeof window==='undefined'?globalThis:window);
