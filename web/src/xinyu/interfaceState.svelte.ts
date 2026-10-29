// Ephemeral interaction previews never enter the Risu save file.
export const interfaceState = $state({now:Date.now(),roomArrival:0,roomTransitionAt:0,brightnessPreview:null as number|null,activePreview:{} as Record<string,number>,chatDraft:''});
