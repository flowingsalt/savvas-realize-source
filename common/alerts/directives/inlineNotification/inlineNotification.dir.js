angular.module('Realize.alerts.inlineNotificationDirective', [
    'Realize.alerts.inlineAlertService'
])
    .directive('inlineNotification', [
        '$log',
        '$timeout',
        'InlineAlertService',
        function($log, $timeout, InlineAlertService) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var notificationId,
                        notificationTemplate = '<div class="success-message" role="alert" ' +
                            'aria-live="assertive"></div>',
                        fadeTime = 4000;

                    function addNotification (notification) {
                        var notificationTemplateWithText = angular.element(notificationTemplate)
                            .append(notification.alert.msg),
                            notificationType = notification.alert.type,
                            notificationContainer,
                            rowElement,
                            timer,
                            fadeTimeTimer;

                        timer = $timeout(function() {
                            var isRowElementDefined = !!attrs.inlineNotificationRowTarget,
                                isNotificationContainerDefined = !!attrs.inlineNotificationTarget;

                            rowElement = isRowElementDefined ? el.find(attrs.inlineNotificationRowTarget) : el;
                            notificationContainer = isNotificationContainerDefined ?
                                rowElement.find(attrs.inlineNotificationTarget) : rowElement;

                            rowElement.addClass(notificationType + 'Row');

                            if (!(rowElement.hasClass('itemRow'))) {
                                rowElement.parent().addClass(notificationType + 'Row');
                            }

                            notificationContainer.prepend(notificationTemplateWithText);
                        }, 1);

                        fadeTimeTimer = $timeout(function() {
                            var msg = notificationContainer.find('.success-message');
                            msg.fadeOut(function() {
                                msg.remove();

                                rowElement.removeClass(notificationType + 'Row');

                                if (!(rowElement.hasClass('itemRow'))) {
                                    rowElement.parent().removeClass(notificationType + 'Row');
                                }
                            });
                        }, fadeTime);

                        scope.$on('$destroy', function destroy() {
                            $timeout.cancel(timer);
                            $timeout.cancel(fadeTimeTimer);
                        });
                    }

                    if (scope.$eval(attrs.isInlineNotificationInterpolated)) {
                        notificationId = attrs.inlineNotification;

                        attrs.$observe('inlineNotification', function(newInterpolatedValue) {
                            notificationId = newInterpolatedValue;
                        });
                    } else {
                        notificationId = scope.$eval(attrs.inlineNotification);

                        scope.$watch(attrs.inlineNotification, function(newValue) {
                            notificationId = newValue;
                        });
                    }

                    scope.$watch(
                        function() {
                            return InlineAlertService.getAlert(notificationId, true);
                        },
                        function(newNotification) {
                            if (newNotification) {
                                $log.debug('new alert', newNotification);
                                addNotification(newNotification);
                            }
                        }
                    );
                }
            };
        }
    ]);
