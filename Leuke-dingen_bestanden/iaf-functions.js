// formutil.js
var WebmanagerFormStateRegistry = {};

//
// Utility function to support the clientside framework. 
// This file is javascript library independent.
//

var FormsUtil = function() {

  //
  // Function to check if the client is an internet explorer browser
  //
  function isIE() {
    var isIE = (navigator.appVersion.indexOf("MSIE") != -1) ? true : false;   // true if we're on ie
    return isIE;  
  }

  //
  // function to normalize a string: convert dots to underscores.
  // this is used, because div id, names are not allowed to have dots in it.
  //
  function normalize(str) {
    // global replace the dot by an underscore
    return str.replace(/\./g,'_');
  }

  //
  // function which makes sure the hidden variable precondition_show and precondition_hide are set correctly.
  // these hidden are set to let the engine know, a field is clientside shown or hidden. 
  // otherwise the engine would return to the same step (for non javascript support)
  //
  function setPrecondition(identifier, inputidentifier, mode, formid) {
    var obj = document.getElementById('precondition_' + formid.replace('wmform_','') + '_' + inputidentifier);
    if (typeof obj != 'undefined') {
      var value = obj.value;
      var spl = value.split(',');

      if (mode == 'add') {
        if (!contains(spl, identifier)) {
          // add it
          spl.push(identifier);
        }
      } else {
        if (contains(spl, identifier)) {
          // remove it
          removeByElement(spl,identifier);
        }        
      }
      obj.value = spl.join(',');
    }
  }

  //
  // function to remove an entry from an array
  //
  function removeByElement(arrayName,arrayElement) {
    for(var i=0; i<arrayName.length;i++) { 
      if(arrayName[i]==arrayElement) {
        arrayName.splice(i,1); 
        break;
      }
    } 
  }

  //
  // function to join the attributes of an object with a delimiter.
  // the joined string is returned
  //
  function join(obj,delimiter) {
    var str = '';
    for(var item in obj) {
      if (str != '') {
        str += delimiter;
      }
      str += obj[item];
    }
    return str;
  }

  //
  // function to check if a value is contained in an array
  //
  function contains(array, element) {
   for (var i = 0; i < array.length; i++) {
     if (array[i] == element) {
       return true;
     }
    }
    return false;
  }

  //
  // function to get an object / attribute based on the attributes of the given object and a dot expression.
  // returns the object / attribute
  //
  function getObject(obj, expression) {
    if ((typeof obj != 'undefined' && obj != null) && (typeof expression != 'undefined' && expression != null)) {
      var index = expression.indexOf('.');
      if (index == -1) {
        return obj[expression];
      } else {
        return getObject(obj[expression.substring(0,index)],expression.substring(index+1, expression.length));
      }
    } else {
      return null;
    }
  }

  //
  // Function to check if fields have to be shown or hidden. The function uses an object from the scope as input.
  //
  function checkConditions(obj, path, formId) {
    var result = new Array();
    // loop over all objects in the scope and check if the visibility is changed
    for (var item in obj) {
      if (obj != null && obj[item] != null) {
        var property = obj[item];
        if (typeof property.checkConditions == 'function') {
          // do the check
          if (property.checkConditions()) {
            if (property.visible) {
              setPrecondition(path + item,'show','add', formId);
              setPrecondition(path + item,'hide','remove', formId);

              result.push({"value":"show","identifier":path + item});
            } else {

              setPrecondition(path + item,'hide','add', formId);
              setPrecondition(path + item,'show','remove', formId);  

              result.push({"value":"hide","identifier":path + item});
            }
          }

        }
        // if object then go recursive to look for subforms and repeaters
        if (typeof property == 'object' && property.visible) {
          // FIXME: maybe this can be optimized??
          var subResult = checkConditions(property,path + item + '.', formId);
          for (i=0;i < subResult.length;i++) {
            result.push(subResult[i]);
          }
        }
      }
    }  
    return result;
  }

  //
  // Public methods and variables.
  //
  return {
    checkConditions:checkConditions,
    getObject:getObject,
    contains:contains,
    join:join,
    isIE:isIE,
    normalize:normalize
  }


}();

var FormValidation = function() {

  //
  // function to trigger a change of a fragment. The fragment will be validated and other fields are checked for
  // possible visual changes (shown or hidden)
  //
  function changeFragment(obj, validate) {
    var formId = obj.parents('form:first').attr("id");
    var step = WebmanagerFormStateRegistry[formId].currentStep();

    var inputName = obj.attr("name");
    var fragmentObj = FormsUtil.getObject(step, inputName);
    var hasErrors = false;

    // set the value in the scope
    var newValue = getFragmentValue(obj);
      
    // only re-validate when the "old" value is not the same as the "new value"
    // or when the "old" value is empty or undefined
    // or when the "new" value is empty or undefined
    if (fragmentObj != null && 
        (fragmentObj.value != newValue || 
            ((fragmentObj.value === '' || fragmentObj.value == undefined) 
                && (newValue === '' || newValue == undefined)))) {
      
      // only trigger actions when the value is changed
      fragmentObj.value = newValue;
      fragmentObj.validated = false;

      // Revalidate the fragment
      if (validate) {
        hasErrors = validateFormFragment(obj, fragmentObj);
      }

      // (2) when a fragment has got a new value, check if other fields have to (dis)appear
      // Added hidden, because you can have a hidden counter (eg for the repeater) which needs to trigger the checkConditions
      var inputType = obj.attr("type");

      var changes = FormsUtil.checkConditions(step, '', formId);
      for (var i=0; i < changes.length;i++) {
        if (changes[i].value == 'show') {
          // throw high level event, so custom code can react on that
          $('#' + FormsUtil.normalize(changes[i].identifier)).trigger('IAF_ShowFormFragment');
        } else {
          // throw high level event, so custom code can react on that
          $('#' + FormsUtil.normalize(changes[i].identifier)).trigger('IAF_HideFormFragment');
        }
      }
    }
    return hasErrors;
  }

  //
  // Function to validate a form fragment
  // Returns true if an error has occurred
  //
  function validateFormFragment(inputObj, fragmentObj) {
    var inputName = inputObj.attr("name");
	var formId = inputObj.parents('form:first').attr("id");
    var hasError = false;
    if (fragmentObj != null && !fragmentObj.validated) {

      // validate the input: only when visible
      if (inputObj.is(":visible")) {
        var validationResult = fragmentObj.validate();

        // gather the errors
        var errors = FormsUtil.join(validationResult,',');
        hasError = (errors != '');

        var errorDivId = "error_" + formId + "_" + FormsUtil.normalize(inputName);
        var errorObj = $("#" + errorDivId);
        if (errorObj.length > 0) {
          if (errors != '') {
            errorObj.trigger('IAF_ShowError',[errorDivId,validationResult]);
          } else {
            errorObj.trigger('IAF_HideError', errorDivId);
          }
        }
      }
    }
    return hasError;
  }


  //
  // Function for validating the form: the inputs are validated and the form is not submitted, when there are errors
  //
  function validateForm(formObj, step) {
    // loop over the inputs
    var hasError = false;
    $(':input[name][type!="hidden"][type!="button"][type!="submit"]', formObj).each(function() {
      var inputName = $(this).attr("name");
      var inputType = $(this).attr("type");
        // first, call changeFragment to set the "value" property for this formFragment
        var fragmentError = FormValidation.changeFragment($(this), true);
      
        // validate the formFragment again, now that the formFragment definitly has its "value" property set
      var fragmentObj = FormsUtil.getObject(step, inputName);
        fragmentError = validateFormFragment($(this), fragmentObj);
        
      if (fragmentError) {
        hasError = true;
      }
    });
    return hasError;
  }

  //
  // function to trigger a submit. Before submitting, all values which are not visible are cleared.
  //
  function submitForm(formObj, step) {
    // (4) make the value empty to prevent to be routed to the same step
    // issue: http://jira.gxdeveloperweb.com/jira/browse/GXWMF-626

    formObj.unbind('submit');

    $(':input', formObj).each(function() {
      // skip the hidden inputs
      var inputName = $(this).attr("name");

      var fragmentObj = FormsUtil.getObject(step, inputName);
      if (fragmentObj != null && !fragmentObj.visible) {
        // clear the value
        switch(this.type) {
          case 'password':
          case 'select-multiple':
          case 'select-one':
          case 'text':
          case 'textarea':
            $(this).val('');
            break;
          case 'checkbox':
          case 'radio':
            $(this).removeAttr("checked");
            // add an empty input type="hidden": this because the browser doesn't send an empty radio
            formObj.append('<input type="hidden" name="' + inputName + '" value="" />');
        }
      }
    });
    formObj.trigger('IAF_SubmitForm');
  };


  //
  // Utility functions with jQuery syntax, and thus not in the formutil.js
  // Get the value(s) for an object. This implementation differs per input type
  //
  function getFragmentValue(obj) {
    value = obj.val();

    if (obj.attr("type") == 'radio') {
      var fieldname = obj.attr("name");
      fieldname = fieldname.replace(/\./g, "\\.");
      value = $('input[name=' + fieldname + ']:checked').val();
    }
    // for checkboxes we pass the array of values
    if (obj.attr("type") == 'checkbox') {
      values = $("input:checkbox[name='" + obj.attr("name") + "']:checked") || [];
      value = new Array();

      i=0;
      values.each(function() {
        value.push($(this).val());
        i++;
      });
    }
    return value;
  }

  //
  // Public methods and variables.
  //
  return {
    changeFragment:changeFragment,
    submitForm:submitForm,
    validateForm:validateForm,
    validateFormFragment:validateFormFragment,
    getFragmentValue:getFragmentValue
  }

}();

//
// Implemented interaction:
//  (1) onchange: the fragment is validated clientside
//  (2) onchange of a radio, checkbox or selectbox, the preconditions are verified to determine if part of the form has to be shown or not
//  (3) onsubmit: all fields, which are not validated yet are validated. When there are errors the form is not posted
//  (4) onsubmit: when the form is posted: fields which are not visible are cleared
//  (5) onload: the value and the visibility from the inputs are set. This is for the Firefox prefilling values
//

$(document).ready(function(event) {

  //
  // implemented a optimization for the clientside framework:
  //  - load the formState object aynsychronous
  //  - cache the formState serverside
  //  - add an extra call for the filled in values
  //  - init the bindings
  //
  $('.wmpform').each(function() {
    var url = $(this).find('.csfw').val();
    var versionId = $(this).find('.csfw_versionId').val();
    var stepId = $(this).find('.csfw_stepId').val();
    var formId = $(this).attr("id");
    var formObj = $(this);

    if (typeof url != 'undefined') {
      $.ajax({
        url: url,
        async: true,
        success: function(data) {
          eval(data);
          var formState = WebmanagerFormStateRegistry[formId];
                    
          // we don't get the form values from the user when we don't have a wmstepid in the form
          if (stepId != '') {
          
            $.getJSON(contextPath + '/wcbservlet/nl.gx.forms.wmpformelement.servlet?formVersionId=' + versionId, function(data) {
              $.each(data.steps, function(j,step){
                var stepId = step.identifier;
                $.each(step.fragments, function(i,item){
                  if (typeof item.name != 'undefined') {

                    var fragmentObj = FormsUtil.getObject(formState[stepId], item.name);
                    if (fragmentObj != null) {                                            
                      fragmentObj.value = item.value;
                      fragmentObj.visible = item.visible;    
                    }            
                  }  
                });
              });
              init(formObj);

            });
          } else {
            init(formObj);
          }
        }
      });
    } else {
      // do the old behavior
      init(formObj);
    }
  });
  
  // Capture the high level events
  $('div').on('IAF_ShowFormFragment',function() {
	$(this).show();
    return false;
  });

  $('div').on('IAF_HideFormFragment',function() {
	$(this).hide();
    return false;
  });
  
  $('form').on('IAF_SubmitForm',function() {
	$(this).submit();
    return false;
  });

  $('div').bind('IAF_ShowError',function(e, errorDivId, errors) {
    $('#' + errorDivId)
		.html('<ul><li>' + FormsUtil.join(errors,'</li><li>') + '</li></ul>')
		.addClass('error-message')
		.show();
	$('#' + errorDivId)
		.closest('.fieldgrp')
		.addClass('error');
  });

  $('div').bind('IAF_HideError',function(e, errorDivId) {  
    $('#' + errorDivId)
		.empty()
		.hide();
    $('#' + errorDivId)
		.parents('.fieldgrp')
		.removeClass('error-message')
		.removeClass('error');
  });

  //
  // The init is called after the form values from the use are set in the client side framework:
  // Now we can add the events.
  //
  function init(formObj) {
    //
    // (1) Set a change event on all inputs: we can determine clientside if other fields needs to be shown
    // This is not done by looping over the inputs, because this doesn't work for repeats
    //
    formObj.find(':input').change(function() {  
      FormValidation.changeFragment($(this), true);
    });

    // (3) validate all inputs when the form is submitted
    formObj.submit(function(event) {

      var formId = $(this).attr("id");
      var step = WebmanagerFormStateRegistry[formId].currentStep();

      if (!$(this).hasClass("IAF_backpressed")) {
        event.preventDefault();
        var hasErrors = FormValidation.validateForm($(this), step);
        if (!hasErrors) {
          var actionButton = $(this).data("actionButton");
          if (actionButton != undefined && actionButton != '') {
            var action = actionButton.closest(".wm-field").attr("id");
            if (action != undefined && action != '') {
              var actionField = actionButton.attr("data-iaf_action");
              if (actionField != undefined && actionField != '') {
                $(formObj).find(actionField).val(action);
              }
            }
            $(formObj).removeData("actionButton");
          }
          
          // now we can submit the form
          FormValidation.submitForm($(this), step);
        }
      }
    });
    
    formObj.find('.wm_input_back_button').click(function() {
      formObj.addClass("IAF_backpressed");
    });
   
    $(':input:submit[data-iaf_action],:input:button[data-iaf_action]', formObj).bind("click", function(event) {
      event.preventDefault();
      $(formObj).data("actionButton", $(this));
      $(formObj).trigger("submit");
    });
    
    //
    // Set a click event on all radio inputs and pipe it to the onChange
    // this to avoid problems in IE6/IE7/IE8 that have a different event model
    //
    formObj.find(':input:radio').click(function() {
      if (FormsUtil.isIE) {
        $(this).change();
      }
    });


    //
    // (5) Set the initial value and visibility
    //
    var inputsWithValue = new Array();
    // This is for the radio and checkboxes: we only need to set them once
    var done = new Array();
  
    formObj.find(':input').each(function() {
      var formId = formObj.attr("id");
      var step = WebmanagerFormStateRegistry[formId].currentStep();
    
      var inputName = $(this).attr("name");
      var inputType = $(this).attr("type");
      if (inputName != '' && !FormsUtil.contains(done, inputName)) {
        if (inputType != 'hidden') {
          done.push(inputName);
        }
        
        var fragmentObj = FormsUtil.getObject(step, $(this).attr("name"));
  
        if (fragmentObj != null) {    
          fragmentObj.visible = $(this).is(":visible");
          var value = FormValidation.getFragmentValue($(this));            
          if (value != '') {
            inputsWithValue.push($(this));
          }
        }
      }  
    });
    
    // trigger the change event after the value and visibility is set
    for (var i=0;i<inputsWithValue.length;i++) {
      FormValidation.changeFragment(inputsWithValue[i], false);
    }
    formObj.trigger('IAF_ClientsideFrameworkLoaded');

  }
});

/* Dutch (UTF-8) initialisation for the jQuery UI date picker plugin. */
/* Written by Mathias Bynens <http://mathiasbynens.be/> */
jQuery(function($){
        $.datepicker.regional['nl'] = {
                closeText: 'Sluiten',
                prevText: 'Vorige',
                nextText: 'Volgende',
                currentText: 'Vandaag',
                monthNames: ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
                'juli', 'augustus', 'september', 'oktober', 'november', 'december'],
                monthNamesShort: ['jan', 'feb', 'maa', 'apr', 'mei', 'jun',
                'jul', 'aug', 'sep', 'okt', 'nov', 'dec'],
                dayNames: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
                dayNamesShort: ['zon', 'maa', 'din', 'woe', 'don', 'vri', 'zat'],
                dayNamesMin: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
                weekHeader: 'Wk',
                dateFormat: 'dd-mm-yy',
                firstDay: 1,
                isRTL: false,
                showMonthAfterYear: false,
                yearSuffix: ''};
        $.datepicker.setDefaults($.datepicker.regional['nl']);
});