#include <Carbon/Carbon.h>

// All calls run on the application's main event loop.
static EventHandlerRef handler;
static EventHotKeyRef hot_key;
static void (*on_capture)(void);
static const EventHotKeyID capture_id = { 'NUTB', 1 };

static OSStatus pressed(EventHandlerCallRef next, EventRef event, void *context) {
    (void)next;
    (void)context;
    EventHotKeyID id;
    OSStatus status = GetEventParameter(event, kEventParamDirectObject,
        typeEventHotKeyID, NULL, sizeof(id), NULL, &id);
    if (status != noErr || id.signature != capture_id.signature || id.id != capture_id.id)
        return eventNotHandledErr;
    on_capture();
    return noErr;
}

void nut_capture_unregister(void) {
    if (hot_key) UnregisterEventHotKey(hot_key);
    if (handler) RemoveEventHandler(handler);
    hot_key = NULL;
    handler = NULL;
    on_capture = NULL;
}

OSStatus nut_capture_register(void (*callback)(void)) {
    const EventTypeSpec type = { kEventClassKeyboard, kEventHotKeyPressed };
    on_capture = callback;
    OSStatus status = InstallApplicationEventHandler(pressed, 1, &type, NULL, &handler);
    if (status == noErr) {
        status = RegisterEventHotKey(kVK_ANSI_N, cmdKey | optionKey, capture_id,
            GetApplicationEventTarget(), kEventHotKeyExclusive, &hot_key);
    }
    if (status != noErr) nut_capture_unregister();
    return status;
}
