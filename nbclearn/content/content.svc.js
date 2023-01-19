angular.module('Realize.NbcLearn.content.content', [
    'RealizeDataServices',
    'Realize.content.model.contentItem'
])
.config(['$provide',
   function($provide) {
        'use strict';

        $provide.decorator('Content', [
            '$delegate',
            function($delegate) {
                function stripWhites(str) {
                    return angular.isString(str) ? str.replace(/ /g, '') : str;
                }

                $delegate.prototype.$isNbcItem = function() {
                    var type = stripWhites((this.fileType).toLowerCase()),
                        contributor = stripWhites((this.contribSource).toLowerCase()),
                        source = stripWhites((this.externalSource).toLowerCase());

                    return type === 'nbclearn' || contributor === 'nbclearn' || source === 'nbclearn';
                };

                return $delegate;
            }
        ]);
    }
]);
