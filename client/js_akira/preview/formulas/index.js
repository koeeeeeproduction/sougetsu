





(function() {
    'use strict';

    
    PreviewEngine.FormulaUtils = {

        


        getByCategory: function(category) {
            var result = [];
            var Formulas = PreviewEngine.Formulas;

            for (var key in Formulas) {
                if (Formulas.hasOwnProperty(key)) {
                    var formula = Formulas[key];
                    if (formula.category === category) {
                        result.push({
                            name: key,
                            formula: formula
                        });
                    }
                }
            }
            return result;
        },

        


        getCategories: function() {
            var categories = {};
            var Formulas = PreviewEngine.Formulas;

            for (var key in Formulas) {
                if (Formulas.hasOwnProperty(key)) {
                    var formula = Formulas[key];
                    if (formula.category) {
                        categories[formula.category] = true;
                    }
                }
            }
            return Object.keys(categories);
        },

        


        getDefaultParams: function(formulaName) {
            var formula = PreviewEngine.Formulas[formulaName];
            if (!formula || !formula.params) return {};

            var defaults = {};
            for (var key in formula.params) {
                if (formula.params.hasOwnProperty(key)) {
                    defaults[key] = formula.params[key].default;
                }
            }
            return defaults;
        },

        


        validateParams: function(formulaName, params) {
            var formula = PreviewEngine.Formulas[formulaName];
            if (!formula || !formula.params) return params;

            var validated = {};
            var paramDefs = formula.params;

            for (var key in paramDefs) {
                if (paramDefs.hasOwnProperty(key)) {
                    var def = paramDefs[key];
                    var value = params[key] !== undefined ? params[key] : def.default;

                    
                    if (def.min !== undefined && value < def.min) value = def.min;
                    if (def.max !== undefined && value > def.max) value = def.max;

                    validated[key] = value;
                }
            }
            return validated;
        },

        


        count: function() {
            return Object.keys(PreviewEngine.Formulas).length;
        }
    };

})();
