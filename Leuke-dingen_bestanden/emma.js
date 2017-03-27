$(document).ready(function() {

$('.pgwSlider').pgwSlider({transitionEffect : 'sliding', displayList : false, transitionDuration : '5000', intervalDuration : '5000',maxHeight : '400'});


$(function() {
    $( "#button-search" ).click(function(){
      $( ".search-default" ).switchClass( "search-default", "search-show", 1000 );
      $( ".search-show" ).switchClass( "search-show", "search-default", 500 );
      $(function() {
            $("#query109496").focus();
        });
    });
  });


 $('#right-menu').sidr({
      name: 'sidr-right',
      side: 'right',
     source: '.navigation-default'
    });
});
/*tabs*/
function TabsActivate(rootnode, selectedindex) {
    var rootdivs;
    function findDivs(parentnode) {
        var kids = parentnode.childNodes;
        var len = kids.length;
        var i;
        var result = [];
        var kid;

        for (i=0; i<len; i++) {
            kid = kids[i];
            if (kid.nodeName.toLowerCase() === "div") {
                result.push(kid);
            }
        }
        return result;
    }

    function activatePane(panes, selectedindex) {
        var classname;
        var i;
        for (i=0; i < panes.length; i++) {
            classname = panes[i].className.replace("tabsactive","tabsinactive");
            panes[i].className = classname.replace("tabsinactive",
                i === selectedindex ? "tabsactive" : "tabsinactive");
        }
    }

    rootdivs = findDivs(rootnode);
    activatePane(findDivs(rootdivs[0]), selectedindex);
    activatePane(findDivs(rootdivs[1]), selectedindex);
    return false;
}
/*button top scroll*/
jQuery(document).ready(function($) {
    $(".scroll").click(function(event) {
    event.preventDefault();
    $('html,body').animate( { scrollTop:$(this.hash).offset().top } , 1000);
    } );
  } );

/*routelijst*/
    document.getElementById("routelijst").onchange = function() {
        if (this.selectedIndex!==0) {
            window.location.href = this.value;
        }        
    };