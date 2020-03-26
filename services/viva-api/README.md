# Viva API

## Requirements

- Homebrew
- Pyenv
- Python 3.7.0
- Virtualenv

## Getting started

1. Make sure [homebrew](https://brew.sh) is installed and up to date:

```
$ brew update
```

2. We need pyenv to manage python versions globally, install it using homebrew:

```
$ brew install pyenv
```

3. Make sure pyenv is installed correctly. Running this command should list avalible python versions:

```
$ pyenv versions
```

4. Install python 3.7.0 using pyenv:

```
$ pyenv install 3.7.0
```

5. Switch to python 3.7.0 globally using pyenv:

```
$ pyenv global 3.7.0
```

6. Verify python version:

```
$ pyenv versions
$ which python
```

7. Install virtualenv using pip

```
$ pip install virtualenv
```

7. Verify virtualenv:

```
$ virtualenv --version
```

8. Create a virtual enviroment for the project & activate

```
$ cd viva-api
$ virtualenv env
$ source env/bin/activate
```

9. Install dependencies from requirements.txt (within the virtual enviroment)

```
(env) pip install -r requirements.txt
```

10. Deploy to aws

```
(env) sls deploy
```

## How to add python dependencies

1. Activate the virtual enviroment

```
$ source env/bin/activate
```

2. Install package using pip

```
(env) pip install <package-name>
```

3. Add dependencies to requirements.txt

```
(env) pip freeze > requirements.txt
```
