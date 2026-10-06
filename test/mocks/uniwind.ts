// uniwind ships untranspiled TypeScript that Jest can't load; jest.config.js maps 'uniwind' here.
// Tests that need specific behaviour can still override it with jest.mock('uniwind', ...).
export const withUniwind = <T>(component: T): T => component;
export const useCSSVariable = (): undefined => undefined;
export const Uniwind = { setTheme: jest.fn() };
