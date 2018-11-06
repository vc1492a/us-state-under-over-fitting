# A Visual Look at Under and Overfitting using U.S. States

A visual example of the concepts of under and overfitting in supervised
machine learning using U.S. state border data provided by the U.S.
Census Bureau.

[![License](https://img.shields.io/packagist/l/doctrine/orm.svg)](https://opensource.org/licenses/MIT)

## What's Inside?

This repository contains a jupyter notebook and D3 visualization that showcases visual
examples of the concepts of under and overfitting. In the notebook,
data is processed, models are fit, and decision surfaces visualized, as
shown below.

![notebook_surface](images/notebook_surface.png)

The [D3 visualization](https://vc1492a.github.io/us-state-under-over-fitting/)
can be used to explore decision surfaces generated in the
notebook interactively. On the left are toggles for different views, and
on the right selections for models and their respective decision surfaces.

![visualization_surface](images/visualization_surface.png)

This repository and its contents serve as a learning exercise on the
effects of under and overfit models' generalizability to new data - using
U.S. states helps because the appropriate geographic shapes are familiar
to many.

## How To

From this repository's root directory, do the following to start the notebook:

```sh
cd notebooks
jupyter notebook
```

Click `Under and Overfitting by Example - 48 U.S. Contiguous States.ipynb`.

To start the D3 visualization, the following will work using Python 3:

```sh
cd visualization
python3 -m http.server
```

Go to `localhost:8000` in your browser. The initial load may take a few
seconds while the data is processed - a map will appear when ready.
Use the toggle switches in the top left to alter views and the selections
in the top right to select between models.

## License
This project is licensed under the MIT license.

## Contributors

- [Valentino Constantinou](https://github.com/vc1492a)
- Christopher Laporte

## Acknowledgements

- [Ian Colwell](https://github.com/iancolwell)
- [Kyle Hundman](https://github.com/khundman)
