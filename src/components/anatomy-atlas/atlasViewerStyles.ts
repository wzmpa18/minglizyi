export const atlasViewerStyles=String.raw`
.atlas-viewer{color:#e6edf2;background:#101417;max-width:1400px;margin:auto;isolation:isolate}
.atlas-viewer :where(button,select,input){font-family:inherit;color:inherit}
.atlas-viewer button{cursor:pointer}
.atlas-viewer button:disabled{opacity:.35;cursor:default}
.atlas-control{min-height:38px;padding:7px 10px;border:1px solid #47535c;border-radius:7px;background:#20282ee8;font-size:12px;line-height:1.4;text-decoration:none}
.atlas-header{padding:16px;display:flex;gap:12px;align-items:center;justify-content:space-between}
.atlas-stage[data-clean=true] .atlas-nav,.atlas-stage[data-clean=true] .atlas-actions,.atlas-stage[data-clean=true] .atlas-quick-list,.atlas-stage[data-clean=true] .atlas-label,.atlas-stage[data-clean=true] .atlas-point-dock,.atlas-stage[data-clean=true] .atlas-hint,.atlas-stage[data-clean=true] [aria-label="当前可见穴位名称"]{display:none}
.atlas-stage{--atlas-panel-width:clamp(132px,42vw,220px);display:flex;position:relative;width:100%;overflow:hidden;background:#101417;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.atlas-canvas{position:relative;flex:1;min-width:0;height:100%;overflow:hidden}
.atlas-titlebar{position:absolute;z-index:25;left:0;right:0;top:0;padding:calc(env(safe-area-inset-top,0px) + 8px) 10px 8px;min-height:58px;box-sizing:border-box;display:flex;gap:8px;align-items:center;background:linear-gradient(#101417f5,#101417ca,transparent);pointer-events:none}
.atlas-titlebar>*{pointer-events:auto}
.atlas-titlebar strong{flex:1;text-align:center;font-size:16px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.atlas-titlebar button{display:grid;place-items:center;min-width:40px;min-height:40px;background:transparent;border:0;color:#f1f5f9}
.atlas-nav{position:absolute;z-index:25;left:5px;top:calc(env(safe-area-inset-top,0px) + 90px);display:flex;flex-direction:column;align-items:center;gap:13px}
.atlas-nav .atlas-control{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:44px;min-height:48px;padding:3px 0;background:#1014177a;border-color:transparent;border-radius:5px;font-size:11px;color:#e6edf2;text-shadow:0 1px 3px #000}
.atlas-nav .atlas-control[aria-pressed=true]{color:#90dbd2;background:#284140bd}
.atlas-actions{position:absolute;z-index:26;left:5px;top:calc(env(safe-area-inset-top,0px) + 460px)}
.atlas-actions>.atlas-control{cursor:pointer;text-align:center;display:flex;flex-direction:column;align-items:center;gap:3px;width:44px;padding:3px 0;background:#1014177a;border-color:transparent;font-size:11px}
.atlas-quick-list{position:relative;z-index:20;order:3;flex:0 0 74px;width:74px;height:100%;box-sizing:border-box;padding:calc(env(safe-area-inset-top,0px) + 77px) 4px calc(env(safe-area-inset-bottom,0px) + 38px);display:flex;flex-direction:column;gap:5px;pointer-events:none}
.atlas-quick-list[data-selected=true]{padding-bottom:calc(env(safe-area-inset-bottom,0px) + 160px)}
.atlas-quick-list button{pointer-events:auto}
.atlas-quick-heading{flex:0 0 auto;min-height:34px;border:0;border-radius:3px;background:#263139d9;font-size:11px;color:#d6e4ec}
.atlas-quick-items{min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-width:none;display:flex;flex-direction:column;gap:5px;pointer-events:auto}
.atlas-quick-item{min-height:42px;padding:7px 3px;background:#0b1115a6;color:#f1f5f9;border:0;border-radius:2px;font-size:14px;line-height:1.4;text-shadow:0 1px 2px #000}
.atlas-quick-item[aria-pressed=true]{color:#ffb3a2;background:#472d2ba8;box-shadow:inset 2px 0 #e89989}
.atlas-side{position:relative;z-index:30;flex:0 0 var(--atlas-panel-width);width:var(--atlas-panel-width);height:100%;background:#172026;border-right:1px solid #51616d;min-width:0;overflow:hidden;display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top,0px) + 66px) 7px calc(env(safe-area-inset-bottom,0px) + 12px);box-sizing:border-box;font-size:12px}
.atlas-side[hidden]{display:none}
.atlas-side[data-page=info]{color:#292524;background:#fbfaf7}
.atlas-side[data-page=info] .atlas-control{background:#fff;color:#334155;border-color:#d3d9df}
.atlas-side[data-page=info] .atlas-small,.atlas-side[data-page=info] .atlas-info-source{color:#647078}
.atlas-scroll{min-height:0;overflow:auto;overscroll-behavior:contain;flex:1}
.atlas-row{display:flex;align-items:center;border-bottom:1px solid #ffffff1c;min-height:44px;gap:2px}
.atlas-row[data-selected=true]{background:#40635d66}
.atlas-row button{background:transparent;border:0;padding:6px 2px}
.atlas-name{flex:1;min-width:0;text-align:left;overflow-wrap:anywhere;line-height:1.4}
.atlas-icon{width:30px;flex:0 0 30px;display:flex;align-items:center;justify-content:center;min-height:42px}
.atlas-only{width:34px;flex:0 0 34px;font-size:11px!important;min-height:42px;color:#a7dbd3!important}
.atlas-arrow{width:21px;flex:0 0 21px;min-height:42px}
.atlas-region{margin-left:6px}
.atlas-leaf{padding-left:4px}
.atlas-search{box-sizing:border-box;width:100%;padding:10px 8px;border:1px solid #66757d;border-radius:6px;margin:8px 0;background:#10171d;color:#f1f5f9!important;caret-color:#fff}
.atlas-search::placeholder{color:#9eafb9}
.atlas-side p{line-height:1.7}
.atlas-side h3{font-size:14px;line-height:1.5;margin:12px 0 5px}
.atlas-tools{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0}
.atlas-label{position:absolute;z-index:12;left:56px;right:84px;top:calc(env(safe-area-inset-top,0px) + 65px);display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:7px;border-radius:7px;background:#1d272ee8;font-size:12px}
.atlas-label strong{flex:1;min-width:60px}
.atlas-label button{min-height:32px;padding:5px}
.atlas-point-dock{position:absolute;z-index:28;bottom:0;left:0;right:0;padding:9px 14px calc(env(safe-area-inset-bottom,0px) + 10px);color:#ecf0f3;background:#20282ff5;border-top:1px solid #59636c66;box-sizing:border-box}
.atlas-point-dock-header{display:flex;align-items:center;gap:10px}
.atlas-point-dock-header strong{font-size:18px;font-weight:500;flex:1;text-align:center}
.atlas-point-dock-header small{font-size:10px;color:#b5c6cf}
.atlas-point-dock-header button{border:0;background:transparent;font-size:26px;line-height:1;width:36px;height:32px}
.atlas-point-dock p{margin:4px 0 5px;font-size:12px;line-height:1.5;color:#d3dce2;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2}
.atlas-point-tabs{display:flex;justify-content:center;gap:8px}
.atlas-point-tabs a,.atlas-point-tabs button{display:grid;place-items:center;flex:1;text-align:center;padding:9px 4px;border:0;background:transparent;color:#dce9f1;font-size:12px;text-decoration:none;min-height:34px}
.atlas-point-tabs>*+*{border-left:1px solid #77869140}
.atlas-hint{position:absolute;bottom:10px;left:55px;right:82px;pointer-events:none;color:#bdcbd3;font-size:10px;width:fit-content;padding:5px;text-shadow:0 1px 3px #000}
.atlas-hold{position:absolute;z-index:30;pointer-events:none;display:flex;gap:7px;align-items:center;background:#18332fef;border:1px solid #80c4b6;border-radius:9px;padding:7px;font-size:11px;box-sizing:border-box;max-width:min(180px,calc(100% - 10px))}
.atlas-status{position:absolute;bottom:10px;right:86px;z-index:29;background:#25463fe8;border:1px solid #8bbeb0;border-radius:7px;padding:7px;font-size:11px}
.atlas-progress{width:26px;height:26px;flex:0 0 26px;border-radius:50%;display:grid;place-items:center}
.atlas-progress:after{content:"";width:18px;height:18px;border-radius:50%;background:#18332f}
.atlas-info-source,.atlas-small{font-size:10px;color:#acbcc7;overflow-wrap:anywhere}
.atlas-options label{display:block;margin:14px 0}
.atlas-options input[type=range]{width:100%}
.atlas-side a{color:#8fccc6}
.atlas-side[data-page=info] a{color:#7131a3}
@media(min-width:900px){.atlas-quick-list{flex-basis:100px;width:100px}
.atlas-nav{left:14px}
.atlas-quick-item{min-height:40px}
.atlas-point-dock{left:calc(50% - 240px);right:auto;width:480px;border-radius:10px 10px 0 0}

.atlas-titlebar{padding-left:15px;padding-right:15px}
.atlas-titlebar strong{font-size:18px}}
@media(max-height:620px){.atlas-nav{top:74px;gap:4px}
.atlas-nav .atlas-control{min-height:40px}
.atlas-actions{top:350px}
.atlas-quick-list{top:70px}
.atlas-point-dock p{display:none}}
.atlas-stage[data-sidebar=left]>.atlas-nav{left:calc(var(--atlas-panel-width) + 4px)}
.atlas-stage[data-sidebar=left] .atlas-point-dock,.atlas-stage[data-sidebar=left] .atlas-label{display:none}
.atlas-stage[data-clean=true] .atlas-quick-toggle,.atlas-stage[data-clean=true] .atlas-route-dock{display:none}
.atlas-side-heading{display:flex;flex-wrap:wrap;align-items:center;gap:4px;padding-bottom:6px;font-size:12px}
.atlas-side-heading strong{flex:1;min-width:60px}
.atlas-side-heading label{font-size:10px;line-height:1.5;color:#bdcbd3}
.atlas-side-heading .atlas-control{min-height:30px;min-width:28px;padding:2px 5px}
.atlas-side-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px;margin:0 0 8px}
.atlas-side-tabs .atlas-control{padding:5px 2px;min-height:32px;font-size:11px}
.atlas-side-tabs .atlas-control[aria-pressed=true]{background:#31524e;color:#e7f6f1}
.atlas-side .atlas-options label{margin:10px 0;line-height:1.7}
.atlas-side .atlas-search{padding:8px 5px;font-size:12px;min-width:0}
.atlas-side .atlas-icon{width:24px;flex-basis:24px}
.atlas-side .atlas-only{width:26px;flex-basis:26px;font-size:10px!important}
.atlas-side .atlas-arrow{width:15px;flex-basis:15px}
.atlas-side .atlas-region{margin-left:3px}
.atlas-side .atlas-row{min-height:42px}
.atlas-side .atlas-row button{font-size:12px}
.atlas-side .atlas-name{overflow-wrap:anywhere}
.atlas-tool-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}
.atlas-tool-grid .atlas-control{padding:7px 3px;font-size:11px}
.atlas-quick-header{display:flex;gap:2px;flex:0 0 auto}
.atlas-quick-header .atlas-quick-heading{flex:1;min-width:0}
.atlas-quick-close{width:22px;padding:0;border:0;background:#263139d9;color:#d6e4ec;font-size:20px}
.atlas-quick-toggle{position:absolute;z-index:25;right:4px;top:calc(env(safe-area-inset-top,0px) + 77px);width:66px;min-height:36px;border:0;border-radius:4px;background:#263139dd;color:#d6e4ec;font-size:12px}
.atlas-stage [data-atlas-copyable],.atlas-stage [data-atlas-copyable] *,.atlas-stage :is(input,textarea,select,[contenteditable]){-webkit-user-select:text;user-select:text;-webkit-touch-callout:default}
.atlas-stage :is(button,summary,[data-atlas-control]),.atlas-stage [data-atlas-copyable] :is(button,summary,[data-atlas-control]){-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.atlas-route-dock{position:absolute;z-index:14;bottom:0;left:0;right:0;padding:8px 12px calc(env(safe-area-inset-bottom,0px) + 8px);background:#20282ff2;color:#dce7ec;font-size:11px;line-height:1.5;box-sizing:border-box}
.atlas-route-dock p{margin:3px 0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}
.atlas-route-toggle{border:0;background:transparent;color:#b9d9d2;font-size:11px;padding:4px 0;display:block}
.atlas-route-reading{max-height:150px;overflow:auto;overscroll-behavior:contain}
.atlas-route-reading p{display:block;overflow:visible}
.atlas-route-dock a,.atlas-route-source{color:#b9d9d2;font-size:10px}
.atlas-route-source{display:block;line-height:1.5;margin:4px 0}
@media(min-width:900px){.atlas-stage[data-sidebar=left]>.atlas-nav{left:calc(var(--atlas-panel-width) + 8px)}}
@media(max-height:620px){.atlas-quick-list{top:auto;padding-top:70px}.atlas-side{padding-top:62px}}

`;
