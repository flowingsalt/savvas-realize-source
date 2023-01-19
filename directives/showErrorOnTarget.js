angular.module('RealizeDirectives')
    .directive('showErrorOnTarget', [
        function() {
            'use strict';

            return {
                scope: {
                    target: '=',
                    message: '=',
                    type: '='
                },
                replace: true,
                template: [
                    '<div class="show-error-target" ng-show="false">',
                        '<div alert alert-type="{{ type }}" alert-on="true">',
                            '<div class="icon-container"><i ng-class="iconClass"></i></div>',
                            '<div class="message-container"><span>{{ message }}</span></div>',
                        '</div>',
                    '</div>'
                ].join(''),
                link: function(scope, elem) {
                    var updateError = function(target, message, type) {
                        var content = $(elem).find('[alert]'),
                            messageContainer = $(elem).find('.message-container > span'),
                            icon = $(elem).find('.icon-container i');

                        scope.iconClass = type === 'success' ? 'icon-ok-sign' : 'icon-exclamation-sign';

                        if (target && (scope.currentTarget !== target || scope.currentMessage !== message)) {
                            // for some reason, the screen update happens way late...  even if using $timeout
                            // so, for now, manually update the message and icon.
                            messageContainer.html('');
                            messageContainer.append(message);

                            icon.removeClass().addClass(scope.iconClass);
                            content.find('div:first').removeClass('alert-error alert-success alert-')
                                    .addClass('alert-' + type);

                            target.html('');
                            target.append(content.clone(true));
                        }
                    };

                    scope.$watch('target', function(target) {
                        updateError(target, scope.message, scope.type);
                        scope.currentTarget = target;
                    });

                    scope.$watch('message', function(val) {
                        updateError(scope.target, val, scope.type);
                        scope.currentMessage = val;
                    });

                    scope.$watch('type', function(val) {
                        updateError(scope.target, scope.message, val);
                        scope.currentType = val;
                    });
                }
            };
        }
    ]);
