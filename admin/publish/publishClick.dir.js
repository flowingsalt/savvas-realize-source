angular.module('Realize.admin.publish.publishClick', [
        'Realize.content.model.contentItem',
        'rlzComponents.components.i18n'
    ])
    .directive('publishClick', [
        '$log',
        'Content',
        '$rootScope',
        'Modal',
        'lwcI18nFilter',
        function($log, Content, $rootScope, Modal, lwcI18nFilter) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var clickHandler = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var item = scope.$eval(attrs.publishClick),
                            modalButtons = {};

                        modalButtons[Modal.BUTTONS.OK] = {
                            title: lwcI18nFilter('global.adminUser.publishModal.action.submit'),
                            isDefault: true,
                            handler: function publishModal() {
                                // since some calls can take a while, show immediate user feedback
                                // scroll to top to show publish success message
                                angular.element('html, body').animate({
                                    scrollTop: 0
                                }, 1600);

                                Content.publish(item, function() {
                                    if (attrs.publishAlertTrigger) {
                                        $log.debug('published', attrs.publishAlertTrigger);
                                        $rootScope.$broadcast(attrs.publishAlertTrigger);
                                    } else {
                                        $log.debug(
                                            '[WARN]: publish-alert-trigger not specified.'
                                        );
                                    }
                                });
                            }
                        };

                        modalButtons[Modal.BUTTONS.CANCEL] = {
                            title: lwcI18nFilter('global.adminUser.publishModal.action.cancel'),
                            handler: angular.noop
                        };

                        Modal.simpleDialog(
                            lwcI18nFilter('global.adminUser.publishModal.message.title'),
                            lwcI18nFilter('global.adminUser.publishModal.message.text'),
                            modalButtons
                        );
                    };

                    el.on('click', clickHandler);
                }
            };
        }
    ]);
