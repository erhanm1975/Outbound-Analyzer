/**
 * Process Flow Enumerations and Mappings
 * Centralized dictionary for warehouse job types and process flows.
 */

export const ProcessFlowType = {
    MICP: 'MICP',
    IIBP: 'IIBP',
    IOBP: 'IOBP',
    SIBP: 'SIBP',
    SICP: 'SICP',
    OBPP: 'OBPP',
    PUT_WALL: 'Put-Wall',
} as const;
export type ProcessFlowType = typeof ProcessFlowType[keyof typeof ProcessFlowType];

export const TaskTypeId = {
    PUT_TO_WALL: 'PUT_TO_WALL',
    IDENTICAL_ITEM: 'IDENTICAL_ITEM',
} as const;
export type TaskTypeId = typeof TaskTypeId[keyof typeof TaskTypeId];

export const AdaptationJobProfile = {
    PUT_TO_WALL: 'PUT_TO_WALL',
    IDENTICAL_ITEM: 'IDENTICAL_ITEM',
    MIXED_SINGLES: 'MIXED_SINGLES',
    IDENTICAL_ORDERS: 'IDENTICAL_ORDERS',
    ORDER_BASED: 'ORDER_BASED',
    MULTI_ITEM: 'MULTI_ITEM',
    COMPLEX: 'COMPLEX',
    UNKNOWN: 'UNKNOWN',
} as const;
export type AdaptationJobProfile = typeof AdaptationJobProfile[keyof typeof AdaptationJobProfile];

/** Maps a ProcessFlowType to its specific HTML ID used for DOM injection/scrolling */
export const PickingElementIdMap: Record<string, string> = {
    [ProcessFlowType.MICP]: 'picking_micp',
    [ProcessFlowType.IIBP]: 'picking_iibp',
    [ProcessFlowType.IOBP]: 'picking_iobp',
    [ProcessFlowType.SIBP]: 'picking_sibp',
    [ProcessFlowType.SICP]: 'picking_sicp',
    [ProcessFlowType.OBPP]: 'picking_obpp',
};

/** Maps a ProcessFlowType to its specific HTML ID used for DOM injection/scrolling */
export const PackingElementIdMap: Record<string, string> = {
    [ProcessFlowType.MICP]: 'packing_micp',
    [ProcessFlowType.IIBP]: 'packing_iibp',
    [ProcessFlowType.IOBP]: 'packing_iobp',
    [ProcessFlowType.SIBP]: 'packing_sibp',
    [ProcessFlowType.SICP]: 'packing_sicp',
    [ProcessFlowType.OBPP]: 'packing_obpp',
};
