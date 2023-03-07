export interface ServerlessCommand {
    usage: string;
    lifecycleEvents: string[];
    options?: {
        [key: string]: {
            usage: string;
            shortcut?: string;
        };
    };
    commands?: ServerlessCommandMap;
}

export interface ServerlessHookMap {
    [event: string]: (...rest: any[]) => any;
}

export interface ServerlessCommandMap {
    [command: string]: ServerlessCommand;
}
