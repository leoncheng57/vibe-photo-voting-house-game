const target = `${import.meta.env.BASE_URL}play/${window.location.search}${window.location.hash}`

window.location.replace(target)
