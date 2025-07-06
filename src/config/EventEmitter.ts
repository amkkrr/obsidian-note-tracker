/**
 * Simple event emitter implementation for configuration change notifications
 * Provides type-safe event handling with support for multiple listeners
 */

/**
 * Event listener function type
 */
export type EventListener<T = any> = (data: T) => void;

/**
 * Event listener with metadata
 */
interface ListenerEntry<T = any> {
    listener: EventListener<T>;
    once: boolean;
    id: string;
}

/**
 * Simple, lightweight event emitter for configuration management
 * Supports multiple listeners, one-time listeners, and type safety
 */
export class EventEmitter<TEvents extends Record<string, any> = Record<string, any>> {
    private listeners = new Map<keyof TEvents, ListenerEntry[]>();
    private nextId = 0;
    private maxListeners = 100;

    /**
     * Add an event listener
     * @param event - Event name to listen for
     * @param listener - Function to call when event is emitted
     * @returns Function to remove the listener
     */
    public on<K extends keyof TEvents>(
        event: K,
        listener: EventListener<TEvents[K]>
    ): () => void {
        return this.addListener(event, listener, false);
    }

    /**
     * Add a one-time event listener that will be removed after first call
     * @param event - Event name to listen for
     * @param listener - Function to call when event is emitted
     * @returns Function to remove the listener
     */
    public once<K extends keyof TEvents>(
        event: K,
        listener: EventListener<TEvents[K]>
    ): () => void {
        return this.addListener(event, listener, true);
    }

    /**
     * Remove an event listener
     * @param event - Event name
     * @param listener - Listener function to remove
     * @returns True if listener was found and removed
     */
    public off<K extends keyof TEvents>(
        event: K,
        listener: EventListener<TEvents[K]>
    ): boolean {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners) {
            return false;
        }

        const index = eventListeners.findIndex(entry => entry.listener === listener);
        if (index === -1) {
            return false;
        }

        eventListeners.splice(index, 1);
        
        // Clean up empty arrays
        if (eventListeners.length === 0) {
            this.listeners.delete(event);
        }

        return true;
    }

    /**
     * Emit an event to all registered listeners
     * @param event - Event name to emit
     * @param data - Data to pass to listeners
     * @returns Promise that resolves when all listeners have been called
     */
    public async emit<K extends keyof TEvents>(
        event: K,
        data: TEvents[K]
    ): Promise<void> {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners || eventListeners.length === 0) {
            return;
        }

        // Create a copy to prevent issues if listeners are modified during emit
        const listenersToCall = [...eventListeners];
        const onceListeners: string[] = [];

        // Call all listeners
        const promises = listenersToCall.map(async (entry) => {
            try {
                // Call the listener
                const result = entry.listener(data);
                
                // Handle promise return values
                if (result && typeof result.then === 'function') {
                    await result;
                }

                // Mark once listeners for removal
                if (entry.once) {
                    onceListeners.push(entry.id);
                }
            } catch (error) {
                // Log errors but don't let them stop other listeners
                console.error(`Error in event listener for '${String(event)}':`, error);
            }
        });

        // Wait for all listeners to complete
        await Promise.all(promises);

        // Remove once listeners
        this.removeListenersById(event, onceListeners);
    }

    /**
     * Emit an event synchronously to all registered listeners
     * @param event - Event name to emit
     * @param data - Data to pass to listeners
     */
    public emitSync<K extends keyof TEvents>(
        event: K,
        data: TEvents[K]
    ): void {
        const eventListeners = this.listeners.get(event);
        if (!eventListeners || eventListeners.length === 0) {
            return;
        }

        // Create a copy to prevent issues if listeners are modified during emit
        const listenersToCall = [...eventListeners];
        const onceListeners: string[] = [];

        // Call all listeners synchronously
        for (const entry of listenersToCall) {
            try {
                entry.listener(data);
                
                // Mark once listeners for removal
                if (entry.once) {
                    onceListeners.push(entry.id);
                }
            } catch (error) {
                // Log errors but don't let them stop other listeners
                console.error(`Error in event listener for '${String(event)}':`, error);
            }
        }

        // Remove once listeners
        this.removeListenersById(event, onceListeners);
    }

    /**
     * Remove all listeners for a specific event or all events
     * @param event - Optional event name to remove listeners for
     */
    public removeAllListeners<K extends keyof TEvents>(event?: K): void {
        if (event) {
            this.listeners.delete(event);
        } else {
            this.listeners.clear();
        }
    }

    /**
     * Get the number of listeners for an event
     * @param event - Event name
     * @returns Number of listeners
     */
    public listenerCount<K extends keyof TEvents>(event: K): number {
        const eventListeners = this.listeners.get(event);
        return eventListeners ? eventListeners.length : 0;
    }

    /**
     * Get all event names that have listeners
     * @returns Array of event names
     */
    public eventNames(): Array<keyof TEvents> {
        return Array.from(this.listeners.keys());
    }

    /**
     * Check if there are any listeners for an event
     * @param event - Event name
     * @returns True if there are listeners
     */
    public hasListeners<K extends keyof TEvents>(event: K): boolean {
        return this.listenerCount(event) > 0;
    }

    /**
     * Set the maximum number of listeners per event
     * @param max - Maximum number of listeners
     */
    public setMaxListeners(max: number): void {
        this.maxListeners = Math.max(1, max);
    }

    /**
     * Get the maximum number of listeners per event
     * @returns Maximum number of listeners
     */
    public getMaxListeners(): number {
        return this.maxListeners;
    }

    /**
     * Add a listener with metadata
     * @param event - Event name
     * @param listener - Listener function
     * @param once - Whether this is a one-time listener
     * @returns Function to remove the listener
     */
    private addListener<K extends keyof TEvents>(
        event: K,
        listener: EventListener<TEvents[K]>,
        once: boolean
    ): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }

        const eventListeners = this.listeners.get(event)!;
        
        // Check max listeners limit
        if (eventListeners.length >= this.maxListeners) {
            console.warn(
                `Warning: Possible EventEmitter memory leak detected. ` +
                `${eventListeners.length + 1} listeners added for event '${String(event)}'. ` +
                `Use setMaxListeners() to increase limit.`
            );
        }

        const id = String(this.nextId++);
        const entry: ListenerEntry<TEvents[K]> = {
            listener,
            once,
            id
        };

        eventListeners.push(entry);

        // Return removal function
        return () => {
            this.removeListenersById(event, [id]);
        };
    }

    /**
     * Remove listeners by their internal IDs
     * @param event - Event name
     * @param ids - Array of listener IDs to remove
     */
    private removeListenersById<K extends keyof TEvents>(
        event: K,
        ids: string[]
    ): void {
        if (ids.length === 0) {
            return;
        }

        const eventListeners = this.listeners.get(event);
        if (!eventListeners) {
            return;
        }

        // Remove listeners with matching IDs
        for (let i = eventListeners.length - 1; i >= 0; i--) {
            if (ids.includes(eventListeners[i].id)) {
                eventListeners.splice(i, 1);
            }
        }

        // Clean up empty arrays
        if (eventListeners.length === 0) {
            this.listeners.delete(event);
        }
    }
}

/**
 * Configuration-specific event emitter with predefined event types
 */
export interface ConfigEvents {
    'config-changed': {
        previousConfig: any;
        newConfig: any;
        changedFields: string[];
        timestamp: number;
    };
    'config-validated': {
        config: any;
        isValid: boolean;
        errors: string[];
        warnings: string[];
        timestamp: number;
    };
    'config-reset': {
        previousConfig: any;
        defaultConfig: any;
        timestamp: number;
    };
    'config-imported': {
        importedConfig: any;
        source: string;
        timestamp: number;
    };
    'config-exported': {
        config: any;
        destination: string;
        timestamp: number;
    };
    'config-migrated': {
        fromVersion: string;
        toVersion: string;
        previousConfig: any;
        migratedConfig: any;
        timestamp: number;
    };
}

/**
 * Type-safe event emitter for configuration events
 */
export class ConfigEventEmitter extends EventEmitter<ConfigEvents> {
    /**
     * Emit a configuration change event
     * @param previousConfig - Previous configuration
     * @param newConfig - New configuration
     * @param changedFields - List of changed field names
     */
    public emitConfigChanged(
        previousConfig: any,
        newConfig: any,
        changedFields: string[]
    ): void {
        this.emitSync('config-changed', {
            previousConfig,
            newConfig,
            changedFields,
            timestamp: Date.now()
        });
    }

    /**
     * Emit a configuration validation event
     * @param config - Configuration that was validated
     * @param isValid - Whether validation passed
     * @param errors - Validation errors
     * @param warnings - Validation warnings
     */
    public emitConfigValidated(
        config: any,
        isValid: boolean,
        errors: string[],
        warnings: string[]
    ): void {
        this.emitSync('config-validated', {
            config,
            isValid,
            errors,
            warnings,
            timestamp: Date.now()
        });
    }

    /**
     * Emit a configuration reset event
     * @param previousConfig - Configuration before reset
     * @param defaultConfig - Default configuration applied
     */
    public emitConfigReset(
        previousConfig: any,
        defaultConfig: any
    ): void {
        this.emitSync('config-reset', {
            previousConfig,
            defaultConfig,
            timestamp: Date.now()
        });
    }

    /**
     * Emit a configuration import event
     * @param importedConfig - Configuration that was imported
     * @param source - Source of the imported configuration
     */
    public emitConfigImported(
        importedConfig: any,
        source: string
    ): void {
        this.emitSync('config-imported', {
            importedConfig,
            source,
            timestamp: Date.now()
        });
    }

    /**
     * Emit a configuration export event
     * @param config - Configuration that was exported
     * @param destination - Destination of the export
     */
    public emitConfigExported(
        config: any,
        destination: string
    ): void {
        this.emitSync('config-exported', {
            config,
            destination,
            timestamp: Date.now()
        });
    }

    /**
     * Emit a configuration migration event
     * @param fromVersion - Version migrated from
     * @param toVersion - Version migrated to
     * @param previousConfig - Configuration before migration
     * @param migratedConfig - Configuration after migration
     */
    public emitConfigMigrated(
        fromVersion: string,
        toVersion: string,
        previousConfig: any,
        migratedConfig: any
    ): void {
        this.emitSync('config-migrated', {
            fromVersion,
            toVersion,
            previousConfig,
            migratedConfig,
            timestamp: Date.now()
        });
    }
}

/**
 * Create a new event emitter instance
 * @returns New EventEmitter instance
 */
export function createEventEmitter<T extends Record<string, any> = Record<string, any>>(): EventEmitter<T> {
    return new EventEmitter<T>();
}

/**
 * Create a new configuration event emitter instance
 * @returns New ConfigEventEmitter instance
 */
export function createConfigEventEmitter(): ConfigEventEmitter {
    return new ConfigEventEmitter();
}