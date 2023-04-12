import React, {
    ComponentType,
    createContext,
    FC,
    ReactNode,
    useContext,
    useState,
} from "react";

import absmartly from "@absmartly/javascript-sdk";

import { ABSmartly, ABSmartlyContext, ContextRequestType, SDKOptionsType } from "../../types";

type SDKProviderNoContext = {
    sdkOptions: SDKOptionsType;
    context?: never;
    contextOptions: Record<string, any>;
    children?: ReactNode;
};

type SDKProviderWithContext = {
    context: ABSmartlyContext;
    children?: ReactNode;
    sdkOptions?: never;
    contextOptions?: never;
};

type SDKProviderProps = SDKProviderNoContext | SDKProviderWithContext;

const SDK = createContext<ABSmartly>({ sdk: undefined, context: undefined, resetContext: () => { } });

export const SDKProvider: FC<SDKProviderProps> = ({
    sdkOptions,
    contextOptions,
    context,
    children,
}) => {
    const sdk = context
        ? context._sdk
        : new absmartly.SDK({ retries: 5, timeout: 3000, ...sdkOptions });

    const [providedContext, setProvidedContext] = useState(context ? context : sdk.createContext(contextOptions));

    const resetContext = async (req: ContextRequestType) => {
        try {
            await providedContext.ready()

            const contextData = providedContext.data()

            await providedContext.finalize()

            setProvidedContext(sdk.createContextWith(req, contextData))
        } catch (error) {
            console.error(error)
        }
    }

    const value: ABSmartly = {
        sdk,
        context: providedContext,
        resetContext
    };

    return <SDK.Provider value={value}>{children}</SDK.Provider>;
};

interface WithABSmartlyProps {
    absmartly: ABSmartly;
}

export function withABSmartly<
    P extends WithABSmartlyProps = WithABSmartlyProps
>(Component: ComponentType<P>) {
    const displayName = Component.displayName || Component.name || "Component";

    const ComponentWithABSmartly = (props: Omit<P, keyof WithABSmartlyProps>) => {
        return (
            <SDK.Consumer>
                {(value) => <Component {...(props as P)} absmartly={value} />}
            </SDK.Consumer>
        );
    };

    ComponentWithABSmartly.displayName = `withABSmartly(${displayName})`;

    return ComponentWithABSmartly;
}

export const useABSmartly = () => useContext(SDK);
