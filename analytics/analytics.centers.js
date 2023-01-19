angular.module('Realize.analytics.centers', [
    'realize-lib.analytics',
    'realize-lib.analytics.google',
    'realize-lib.analytics.track-click'
])
    .config([
        'AnalyticsProvider',
        function(AnalyticsProvider) {
            'use strict';

            AnalyticsProvider.addTracker('centers.list.sort', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    var actions = {
                            subject: 'Show by Subject',
                            grade: 'Show by Grade',
                            favorite: 'Show by Favorites'
                        };

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        actions[AnalyticsEvent.action]
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.open', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program) { return; }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')'
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.action', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program) { return; }

                    var eventLabel = AnalyticsEvent.label;

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.info', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.item) { return; }

                    var eventLabel = 'Info (' + AnalyticsEvent.item.$getTitle() + ')';

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.email', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.item) { return; }

                    var eventLabel = 'Email (' + AnalyticsEvent.item.$getTitle() + ')';

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.teacherResources', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.item) { return; }

                    var eventLabel = 'Teacher Resources (' + AnalyticsEvent.item.$getTitle() + ')';

                    if (AnalyticsEvent.content && AnalyticsEvent.content.id !== AnalyticsEvent.program.id) {
                        eventLabel = 'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + eventLabel;
                    }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        eventLabel
                    );
                }
            ]);

            AnalyticsProvider.addTracker('centers.contentQuicklink', [
                'GoogleAnalytics',
                'AnalyticsEvent',
                function(GoogleAnalytics, AnalyticsEvent) {
                    if (!AnalyticsEvent.program || !AnalyticsEvent.content || !AnalyticsEvent.label) { return; }

                    GoogleAnalytics.trackEvent(
                        'Centers',
                        'Program (' + AnalyticsEvent.program.title + ')',
                        'Asset (' + AnalyticsEvent.content.$getTitle() + '): ' + AnalyticsEvent.label
                    );
                }
            ]);

        }
    ]);
