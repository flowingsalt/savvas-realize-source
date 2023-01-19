angular.module('Realize.quicklinks.quickLink', [])
    .directive('quickLink', [
        function() {
            'use strict';

            return {
                /**
                 * arialabel {String} Text used to populate the aria-label attribute
                 * text {String} Text to be displayed in the interface
                 */
                template: [
                    '<li class="quick-link">',
                        '<a aria-label="{{ arialabel }}" aria-relevant="additions" href="javascript://">',
                            '<i class="{{ iconClass }}"></i>',
                            '{{ text }}',
                            '<span class="badge" ng-if="hasBadge">{{badgeText}}</span>',
                        '</a>',
                    '</li>'
                ].join(''),
                replace: true,
                scope: true,
                link: function(scope, el, attrs) {
                    var anchor = el.find('a'),
                        forwardedAttributes,
                        icon = attrs.icon || '',
                        image = attrs.image || '';

                    scope.iconClass = icon ? 'icon-' + icon : 'quicklink-image-' + image;

                    if (el.parent().attr('role') === 'menu') {
                        anchor.attr('role', 'menuitem');
                    }
                    scope.badgeText = attrs.badgeText;
                    scope.hasBadge = angular.isDefined(attrs.badgeText) && attrs.badgeText.length > 0;

                    attrs.$observe('badgeText', function() {
                        var badgeText = angular.isDefined(attrs.badgeText) ? attrs.badgeText.toString() : '';
                        scope.hasBadge = badgeText.length > 0;
                        scope.badgeText = badgeText;
                    });
                    // carry along href to link if provided
                    attrs.$observe('href', function() {
                        if (attrs.href !== '') {
                            anchor.attr('href', attrs.href);
                            if (attrs.target) {
                                anchor.attr('target', attrs.target);
                            }
                        }
                    });

                    //default to false if ng-hide or ng-show are undefined
                    scope.hidden = scope.$eval(attrs.ngHide) || angular.isDefined(attrs.ngShow) ?
                        !scope.$eval(attrs.ngShow) : false;

                    // check for the passed arialabel value and set it, otherwise remove the attribute
                    scope.$watch(attrs.arialabel, function(arialabel) {
                        if (angular.isDefined(attrs.arialabel) && attrs.arialabel !== '') {
                            scope.arialabel = arialabel;
                        } else {
                            anchor.removeAttr('aria-label');
                        }
                    });

                    // copy select attributes as-is to anchor
                    forwardedAttributes = ['download'];
                    angular.forEach(forwardedAttributes, function(attribute) {
                        if (el[0].hasAttribute(attribute)) {
                            attrs.$observe(attribute, function() {
                                anchor.attr(attribute, attrs[attribute]);
                            });
                        }
                    });

                    scope.$watch(attrs.text, function(text) {
                        scope.text = text;
                        if (!!attrs.icon && icon !== attrs.icon) {
                            scope.iconClass = 'icon-' + attrs.icon;
                            icon = attrs.icon;
                        }
                    });

                    scope.$watch(attrs.ngHide, function(val, old) {
                        if (angular.isDefined(val) && val !== old) {
                            scope.hidden = !!val;
                            el.parent().trigger('quicklinkDisplayChange');
                        }
                    });

                    scope.$watch(attrs.ngShow, function(val, old) {
                        if (angular.isDefined(val) && val !== old) {
                            scope.hidden = !!(!val);
                            el.parent().trigger('quicklinkDisplayChange');
                        }
                    });

                    scope.$watch(attrs.ngIf, function(val, old) {
                        if (angular.isDefined(val) && val !== old) {
                            scope.hidden = !!(!val);
                            el.parent().trigger('quicklinkDisplayChange');
                        }
                    });

                }
            };
        }
    ]);
