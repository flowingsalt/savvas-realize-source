angular.module('RealizeDirectives')
    .directive('supportModal', [
        '$log',
        'Modal',
        'Content',
        function($log, Modal, Content) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var itemId = scope.$eval(attrs.supportModal);
                    var itemVersion = 0; // do TS have versions?
                    var tsProps = scope.$eval(attrs.tsProps);
                    var item;
                    var modalScope;

                    function show() {
                        if (!modalScope) {
                            modalScope = scope.$new();
                            modalScope.close = Modal.hideDialog;
                        }
                        modalScope.item = item;
                        modalScope.publishModalItem = false;

                        $log.log('modalScope - Support Modal', modalScope);
                        modalScope.onContentClick = function(event, supportItem) {
                            var contentClick  = scope.$eval(attrs.onContentClick);
                            contentClick(event, supportItem);
                        };
                        Modal.showDialog('templates/partials/programSupportDialog.html', modalScope);
                    }

                    function launch() {
                        if (!item) {
                            var successFn = function(response) {
                                item = response;
                                $log.log('got TS', item, tsProps);
                                if (tsProps) {
                                    item.associativeProps = tsProps.associatedPropertyMap;
                                }

                                show();
                            };

                            Content.get({
                                contentId: itemId,
                                version: itemVersion
                            }, scope.$eval(attrs.getLess)).then(successFn);

                        } else {
                            show();
                        }
                    }

                    el.on('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        launch();
                        // back into angular
                        scope.$applyAsync();
                    });
                }
            };
        }
    ])

    .directive('modalClick', [
        '$log',
        'Modal',
        'Messages',
        function($log, Modal, Messages) {
            'use strict';

            return {
                link: function(scope, el, attrs) {
                    var modalScope = null,
                    modalClickHandler,
                    invokeEventHandler,
                    isGroupedContent = angular.isUndefined(attrs.isGroupedContent) ?
                        false : scope.$eval(attrs.isGroupedContent);

                    modalClickHandler = function(e, contentItem) {
                        if (!scope.$eval(attrs.onDisable)) {
                            if (e.preventDefault) { e.preventDefault(); }
                            if (e.stopPropagation) { e.stopPropagation(); }
                            if (isGroupedContent) {
                                modalScope = scope;
                            } else {
                                modalScope = scope.$new(true); // child scope inherits
                                modalScope.item = scope.$eval(attrs.modalClick) || contentItem;
                                modalScope.params = scope.$eval(attrs.params);
                                modalScope.getMessage = Messages.getMessage; // give modal localization support
                                modalScope.currentUser = scope.currentUser;
                            }
                            modalScope.close = function() {
                                modalScope.$broadcast('info.modal.closed');
                                Modal.hideDialog();
                                if (!isGroupedContent) {
                                    modalScope.$destroy();
                                }
                            };

                            Modal.showDialog(attrs.modalTemplate, modalScope);
                            modalScope.isClose = false;

                            // back into angular
                            scope.$applyAsync();
                        }
                    };

                    invokeEventHandler = function($event, contentItem) {
                        modalClickHandler($event, contentItem);
                    };

                    el.on('click', modalClickHandler);
                    scope.$on('info_modal.invoke', invokeEventHandler);
                }
            };
        }
    ]);
