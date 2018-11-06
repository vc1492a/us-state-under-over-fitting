function clickMenu() {
    let idx = this.parentElement.id;
    let button = document.getElementById(idx);
    let children = button.children;
    children[0].classList.toggle('label_on');
    children[2].classList.toggle('tag_on');
}

let buttons = document.getElementsByClassName("toggle");
for (let i = 0; i < buttons.length; i++) {
    buttons[i].addEventListener('click', clickMenu, false);
}

