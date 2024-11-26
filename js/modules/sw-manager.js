export class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.updateAvailable = false;
        this.vapidPublicKey = null; // Will be set when/if provided
    }

    async register() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported');
            return;
        }

        try {
            // Register service worker
            this.registration = await navigator.serviceWorker.register('/sw.js');

            // Setup update handling
            this.setupUpdateHandling();

            // Setup sync handling
            this.setupSyncHandling();

            console.log('ServiceWorker registered successfully');

        } catch (error) {
            console.error('ServiceWorker registration failed:', error);
            throw error;
        }
    }

    setupUpdateHandling() {
        // Check for updates
        this.registration.addEventListener('updatefound', () => {
            const newWorker = this.registration.installing;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    this.updateAvailable = true;
                    this.notifyUpdateAvailable();
                }
            });
        });

        // Listen for controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (this.updateAvailable) {
                window.location.reload();
            }
        });
    }

    setupSyncHandling() {
        // Register for background sync
        navigator.serviceWorker.ready.then(registration => {
            // Register sync for content updates
            registration.sync.register('sync-content').catch(error => {
                console.warn('Background sync not supported:', error);
            });
        });
    }

    // Method to initialize push notifications with a VAPID key
    async initializePushNotifications(vapidPublicKey) {
        if (!vapidPublicKey) {
            console.warn('Push notifications disabled: No VAPID key provided');
            return;
        }

        this.vapidPublicKey = vapidPublicKey;

        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await this.setupPushSubscription();
            }
        }
    }

    async setupPushSubscription() {
        if (!this.vapidPublicKey) {
            return;
        }

        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
            });

            // Here you would typically send the subscription to your server
            console.log('Push subscription successful:', subscription);

        } catch (error) {
            console.warn('Push subscription failed:', error);
        }
    }

    notifyUpdateAvailable() {
        // Create update notification
        const updateBanner = document.createElement('div');
        updateBanner.className = 'update-banner';
        updateBanner.setAttribute('role', 'alert');
        updateBanner.innerHTML = `
            <p>A new version is available!</p>
            <button class="update-button">Update Now</button>
        `;

        // Add update handler
        const updateButton = updateBanner.querySelector('.update-button');
        updateButton.addEventListener('click', () => {
            // Skip waiting on the service worker
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            updateBanner.remove();
        });

        // Add to page
        document.body.appendChild(updateBanner);
    }

    async unregister() {
        if (this.registration) {
            await this.registration.unregister();
            this.registration = null;
        }
    }

    // Utility method to convert VAPID key
    urlBase64ToUint8Array(base64String) {
        if (!base64String) {
            throw new Error('Invalid VAPID key');
        }

        try {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/\-/g, '+')
                .replace(/_/g, '/');

            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);

            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        } catch (error) {
            throw new Error('Failed to process VAPID key: ' + error.message);
        }
    }

    // Method to check if push notifications are supported and enabled
    async isPushAvailable() {
        return 'Notification' in window &&
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            this.vapidPublicKey !== null;
    }

    // Method to get the current notification permission status
    getNotificationPermission() {
        return Notification.permission;
    }
}
