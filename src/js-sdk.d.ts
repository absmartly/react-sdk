declare module "@absmartly/javascript-sdk" {
  type EventNameType =
    | "error"
    | "ready"
    | "refresh"
    | "publish"
    | "exposure"
    | "goal"
    | "finalize";

  type ContextData = { experiments: Record<string, any>[] };

  type ContextParams = {
    units: Record<string, unknown>;
  };

  type ContextOptions = {
    eventLogger?: (context: Context, eventName: string, data: any) => void;
    refreshPeriod: number;
    publishDelay: number;
  };

  type ClientRequestOptions = {
    query?: Record<string, string | number | boolean>;
    path: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";
    body?: Record<string, unknown>;
    auth?: boolean;
    timeout?: number;
  };

  type SDKOptions = {
    eventLogger?: (context: Context, eventName: EventNameType, data: any) => void;
  };

  type ClientOptions = {
    agent?: "javascript-client";
    apiKey: string;
    application: string | { name: string; version: number };
    endpoint: string;
    environment: string;
    retries?: number;
    timeout?: number;
    keepalive?: boolean;
  };

  type Units = {
    [key: string]: string | number;
  };

  type JSONPrimitive = string | number | boolean | null;
  type JSONObject = { [key: string]: JSONValue };
  type JSONArray = JSONValue[];
  type JSONValue = JSONPrimitive | JSONObject | JSONArray;

  type CustomFieldValueType = "text" | "string" | "number" | "json" | "boolean";

  export class SDK {
    constructor(options: ClientOptions & SDKOptions);
    getContextData(requestOptions: ClientRequestOptions): any;
    createContext(params: ContextParams, options?: Partial<ContextOptions>, requestOptions?: Partial<ClientRequestOptions>): Context;
    setEventLogger(logger: (context: Context, eventName: string, data: any) => void): void;
    getEventLogger(): (context: Context, eventName: string, data: any) => void;
    createContextWith(params: ContextParams, data: ContextData | Promise<ContextData>, options?: Partial<ContextOptions>): Context;
  }

  export class Context {
    constructor(sdk: SDK, options: ContextOptions, params: ContextParams, promise: ContextData | Promise<ContextData>);
    _sdk: SDK;
    _opts: ContextOptions;
    isReady(): boolean;
    isFinalizing(): boolean;
    isFinalized(): boolean;
    isFailed(): boolean;
    ready(): Promise<unknown>;
    pending(): number;
    data(): ContextData;
    eventLogger(): (context: Context, eventName: string, data: any) => void;
    publish(requestOptions?: ClientRequestOptions): Promise<void>;
    refresh(requestOptions?: ClientRequestOptions): Promise<void>;
    getUnit(unitType: string): string | number;
    unit(unitType: string, uid: string | number): void;
    getUnits(): Units;
    units(units: Record<string, number | string>): void;
    getAttribute(attrName: string): undefined;
    attribute(attrName: string, value: unknown): void;
    getAttributes(): Record<string, unknown>;
    attributes(attrs: Record<string, unknown>): void;
    peek(experimentName: string): number;
    treatment(experimentName: string): number;
    track(goalName: string, properties?: Record<string, unknown>): void;
    finalize(requestOptions?: ClientRequestOptions): true | Promise<void>;
    experiments(): string[] | undefined;
    variableValue(key: string, defaultValue: string): string;
    peekVariableValue(key: string, defaultValue: string): string;
    variableKeys(): Record<string, unknown[]>;
    override(experimentName: string, variant: number): void;
    overrides(experimentVariants: Record<string, number>): void;
    customAssignment(experimentName: string, variant: number): void;
    customAssignments(experimentVariants: Record<string, number>): void;
    customFieldKeys(): string[];
    customFieldValue(experimentName: string, key: string): JSONValue;
    customFieldValueType(experimentName: string, key: string): CustomFieldValueType | null;
  }

  export function mergeConfig(context: Context, previousConfig: Record<string, unknown>): any;
}

