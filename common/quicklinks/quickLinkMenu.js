angular.module('Realize.quicklinks.quickLinkMenu', [])
    .directive('quickLinkMenu', [
        function() {
            'use strict';

            var tmpl = [
                '<li ng-class="{open: open, dropup: isdropup}">',
                    '<a ng-click="toggleClick($event);" class="dropdown-toggle" role="button" dropdown-a11y ',
                        'href="javascript://" aria-label="{{ ariaLabelText }}" aria-haspopup="true">',
                        '<i class="icon-{{ toggleIcon }}"></i>',
                        '{{ toggleText }}',
                        '<i class="icon-caret-{{ toggleDirection }}"></i>',
                    '</a>',
                    '<ul class="dropdown-menu quick-link-menu-items" role="menu" ',
                    'ng-class="{ \'pull-right\': !hasAutoAlign }" ng-style="autoAlignStyle" ng-transclude></ul>',
                '</li>'
            ].join('');

            return {
                template: tmpl,
                replace: true,
                scope: true,
                transclude: true,
                link: function(scope, el, attrs) {
                    var options = scope.$eval(attrs.quickLinkMenu);

                    scope.hasAutoAlign = attrs.hasOwnProperty('autoAlign');
                    scope.toggleIcon = options.icon;
                    scope.toggleText = options.text;
                    scope.isdropup = scope.$eval(attrs.isdropup);
                    scope.toggleDirection = scope.isdropup ? 'up' : options.direction;
                    scope.ariaLabelText = options.ariaLabelText;

                    var updateAlignStyles = function() {
                        var bodyWidth = $('body').width();
                        if (scope.hasAutoAlign) {
                            if (attrs.autoAlign === 'right') {
                                var buttonRight = $(el).offset().left + $(el).innerWidth();
                                scope.autoAlignStyle = { right: bodyWidth - buttonRight, left: 'inherit' };
                            } else {
                                scope.autoAlignStyle = { left: $(el).offset().left,  right: 'inherit' };
                            }
                        }
                    };
                    setTimeout(updateAlignStyles, 100);

                    scope.toggleClick = function(e) {
                        if (options.toggleClick && angular.isFunction(options.toggleClick)) {
                            options.toggleClick.call(null, e);
                        }
                    };

                    // template modifications based on passed params
                    if (!scope.toggleIcon) {
                        el.find('> a i:first').remove();
                    }

                    // cache the contents of the menu
                    var items = el.find('.quick-link-menu-items').children();

                    // when a parent list converts, need to convert to just items
                    scope.$on('Realize.quicklinks.quickList.collapse', function() {
                        el.after(items);
                        el.hide();
                    });

                    scope.$on('Realize.quicklinks.quickList.expand', function() {
                        el.find('.quick-link-menu-items').append(items);
                        el.css('display', 'inline-block');
                    });

                    scope.$watch(attrs.isdropup, function(attrDropUp, old) {
                        if (angular.isUndefined(attrDropUp) || angular.isUndefined(old)) { return; }
                        scope.isdropup = attrDropUp;
                        scope.toggleDirection = attrDropUp ? 'up' : 'down';
                    });
                }
            };
        }
    ]);
