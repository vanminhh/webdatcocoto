const chatBody = document.querySelector('.chat-body');
const messageInput = document.querySelector('.message-input');
const sendMessageButton = document.querySelector('#send-message');

const userData = {
    message: null,
}

const botResponses =  {
        "camry": "Toyota Camry 2.0 là một trong những mẫu xe sedan bán chạy nhất của Toyota. Với động cơ khoẻ, sang trọng và giá tiền rơi vào khoảng 2,2 tỷ. Hiện nay AnhHuyAuto đang bán nhiều dòng xe này, mời quý khách qua tham khảo nhé.",
        "corolla": "Toyota Corolla Altis 1.8G có thiết kế thanh lịch, động cơ bền bỉ, tiết kiệm nhiên liệu. Giá xe khoảng 850 triệu tại AnhHuyAuto.",
        "rav4": "Toyota RAV4 2024 là một chiếc SUV nhỏ gọn với động cơ Hybrid tiết kiệm nhiên liệu. Giá xe dao động khoảng 1,5 tỷ.",
        "hilux": "Toyota Hilux Adventure 2.8AT 4x4 là mẫu bán tải mạnh mẽ với động cơ 2.8L, công suất 201 mã lực. Giá khoảng 1,1 tỷ.",
        "yaris": "Toyota Yaris 1.5G CVT là mẫu hatchback nhỏ gọn, phù hợp đô thị, tiết kiệm xăng. Giá khoảng 700 triệu tại AnhHuyAuto.",
        "fortuner": "Toyota Fortuner Legender 2.8AT 4x4 là SUV 7 chỗ mạnh mẽ, trang bị động cơ diesel 2.8L. Giá khoảng 1,4 tỷ.",
        "vios": "Toyota Vios 1.5G CVT là mẫu sedan quốc dân, tiết kiệm nhiên liệu với mức giá từ 600 triệu tại AnhHuyAuto.",
        "innova": "Toyota Innova 2.0E MT là mẫu MPV 7 chỗ rộng rãi, động cơ 2.0L, giá bán khoảng 850 triệu.",
        "land cruiser": "Toyota Land Cruiser 300 là mẫu SUV cao cấp, động cơ 3.5L V6 mạnh mẽ, giá khoảng 4,2 tỷ.",
        "toyota prius": "Toyota Prius 2024 là mẫu xe hybrid tiết kiệm nhiên liệu với công nghệ tiên tiến. Giá xe khoảng 1,2 tỷ.",
        "toyota supra": "Toyota Supra GR 3.0 là một mẫu xe thể thao với động cơ 3.0L Turbo, công suất 382 mã lực. Giá xe khoảng 4 tỷ.",
        "toyota 86": "Toyota 86 GR là mẫu coupe thể thao 2 cửa, động cơ Boxer 2.4L, giá từ 1,8 tỷ.",
        "toyota sienna": "Toyota Sienna 2024 là mẫu minivan rộng rãi, trang bị động cơ hybrid. Giá từ 1,9 tỷ tại AnhHuyAuto.",
        "toyota tundra": "Toyota Tundra 2024 là mẫu bán tải cỡ lớn với động cơ 3.5L V6 mạnh mẽ, giá khoảng 2,8 tỷ.",
        "toyota sequoia": "Toyota Sequoia 2024 là SUV full-size với động cơ hybrid i-Force MAX. Giá khoảng 2,5 tỷ.",
        "highlander": "Toyota Highlander 2024 là SUV 7 chỗ với động cơ 2.4L Turbo, giá khoảng 1,7 tỷ.",
        "toyota c-hr": "Toyota C-HR là mẫu crossover nhỏ gọn, thiết kế hiện đại, giá xe từ 900 triệu.",
        "avalon": "Toyota Avalon 2024 là mẫu sedan hạng sang với động cơ V6 3.5L, giá khoảng 1,9 tỷ.",
        "toyota mirai": "Toyota Mirai chạy bằng pin nhiên liệu hydro, công nghệ xanh thân thiện môi trường, giá từ 1,6 tỷ.",
        "toyota alphard": "Toyota Alphard 2024 là MPV cao cấp với không gian sang trọng, giá từ 4,3 tỷ.",
        "toyota venza": "Toyota Venza 2024 là crossover hybrid tiết kiệm nhiên liệu, giá khoảng 1,5 tỷ.",
        "toyota tacoma": "Toyota Tacoma là bán tải cỡ trung với khả năng off-road mạnh mẽ. Giá từ 1,3 tỷ.",
        "toyota fj cruiser": "Toyota FJ Cruiser là mẫu SUV retro với khả năng địa hình tốt. Giá từ 1,2 tỷ.",
        "toyota matrix": "Toyota Matrix là hatchback với thiết kế thể thao, giá từ 800 triệu.",
        "toyota verso": "Toyota Verso là mẫu MPV nhỏ gọn, giá từ 900 triệu.",
        "toyota proace": "Toyota Proace là xe van đa dụng, phù hợp cho kinh doanh, giá từ 1,1 tỷ.",
        "toyota aygo": "Toyota Aygo là xe đô thị nhỏ gọn, tiết kiệm nhiên liệu, giá từ 500 triệu.",
        "toyota iq": "Toyota iQ là xe city car cỡ nhỏ, giá từ 400 triệu.",
        "toyota urban cruiser": "Toyota Urban Cruiser là crossover nhỏ gọn, giá khoảng 850 triệu.",
        "toyota etios": "Toyota Etios là sedan giá rẻ, giá khoảng 600 triệu.",
        "toyota rush": "Toyota Rush là SUV nhỏ gọn, động cơ 1.5L, giá từ 700 triệu.",
        "toyota avanza": "Toyota Avanza là MPV 7 chỗ, phù hợp gia đình, giá từ 650 triệu.",
        "toyota corolla cross": "Toyota Corolla Cross Hybrid 1.8HV tiết kiệm nhiên liệu, giá khoảng 900 triệu.",
        "toyota gr yaris": "Toyota GR Yaris là hatchback thể thao, công suất 268 mã lực, giá từ 2 tỷ.",
        "toyota gr supra": "Toyota GR Supra là coupe thể thao, giá khoảng 4 tỷ.",
        "toyota gr 86": "Toyota GR 86 là xe thể thao nhỏ gọn, giá từ 1,7 tỷ.",
        "toyota hilux revo": "Toyota Hilux Revo là bản nâng cấp của Hilux, giá từ 950 triệu.",
        "toyota land cruiser prado": "Toyota Land Cruiser Prado là SUV off-road, giá từ 2,5 tỷ.",
        "toyota land cruiser 200": "Toyota Land Cruiser 200 là SUV cỡ lớn, giá từ 3,5 tỷ.",
        "toyota land cruiser 300": "Toyota Land Cruiser 300 là phiên bản mới nhất, giá từ 4,2 tỷ.",
        "toyota land cruiser 70": "Toyota Land Cruiser 70 là dòng xe cổ điển, giá từ 2,3 tỷ.",
        "toyota land cruiser 80": "Toyota Land Cruiser 80 là mẫu SUV với thiết kế hoài cổ, giá từ 2,1 tỷ.",
        "toyota land cruiser 100": "Toyota Land Cruiser 100 là phiên bản cao cấp, giá từ 3 tỷ.",
        "toyota land cruiser 105": "Toyota Land Cruiser 105 có khả năng địa hình tốt, giá từ 2,2 tỷ.",
        "toyota crown": "Toyota Crown 2024 là mẫu sedan sang trọng, giá từ 2,8 tỷ.",
        "toyota bZ4X": "Toyota bZ4X là mẫu SUV chạy điện hoàn toàn, giá từ 1,6 tỷ.",
        "toyota lexus lx570": "Toyota Lexus LX570 là SUV cao cấp, giá khoảng 8 tỷ.",
        "toyota là hãng xe của nước nào?": "Toyota là hãng xe của Nhật Bản, được thành lập vào năm 1937 bởi Kiichiro Toyoda. Đây là một trong những nhà sản xuất ô tô lớn nhất thế giới.",
    "toyota có bao nhiêu dòng xe?": "Toyota có rất nhiều dòng xe thuộc các phân khúc khác nhau, bao gồm sedan, SUV, MPV, bán tải, xe thể thao và xe điện như Camry, Corolla, Fortuner, Hilux, Land Cruiser, Supra, bZ4X...",
    "toyota có sản xuất xe điện không?": "Có, Toyota đang phát triển mạnh dòng xe điện với các mẫu như Toyota bZ4X, Mirai (chạy bằng pin nhiên liệu hydro), và nhiều phiên bản hybrid như Corolla Cross Hybrid, Camry Hybrid.",
    "xe hybrid của toyota có đáng mua không?": "Xe hybrid của Toyota rất đáng mua nhờ tiết kiệm nhiên liệu, bảo vệ môi trường và vận hành êm ái. Các mẫu hybrid nổi bật là Corolla Cross Hybrid, Camry Hybrid, Prius, Highlander Hybrid.",
    "toyota có xe nào chạy điện hoàn toàn không?": "Có, Toyota hiện có mẫu bZ4X chạy điện hoàn toàn, cùng với Mirai sử dụng pin nhiên liệu hydro.",
    "toyota có xe thể thao không?": "Toyota có nhiều mẫu xe thể thao như Toyota GR Supra, Toyota GR 86 và Toyota GR Yaris, mang đến trải nghiệm lái đầy phấn khích.",
    "toyota có bền không?": "Toyota nổi tiếng về độ bền và ít hỏng vặt. Các dòng xe của Toyota thường có tuổi thọ cao, phụ tùng dễ thay thế và bảo trì đơn giản.",
    "toyota có xe 7 chỗ không?": "Có, Toyota có nhiều mẫu xe 7 chỗ như Fortuner, Innova, Avanza, Veloz Cross, Highlander, Sienna, Land Cruiser...",
    "toyota có xe bán tải không?": "Có, Toyota Hilux và Toyota Tundra là hai dòng bán tải nổi tiếng, mạnh mẽ và bền bỉ.",
    "toyota có xe nào giá rẻ không?": "Có, các dòng xe giá rẻ của Toyota như Toyota Vios, Toyota Wigo, Toyota Agya, Toyota Aygo có giá khởi điểm từ 400 triệu.",
    "toyota có xe nào cho gia đình không?": "Có, Toyota có nhiều mẫu xe phù hợp gia đình như Innova, Avanza, Veloz Cross, Sienna, Highlander với không gian rộng rãi và an toàn cao.",
    "toyota có xe nào chạy dịch vụ tốt không?": "Toyota Vios, Toyota Innova và Toyota Avanza là những mẫu xe phổ biến cho dịch vụ taxi, Grab nhờ tiết kiệm nhiên liệu và bền bỉ.",
    "toyota có xe nào tiết kiệm xăng không?": "Các dòng hybrid như Toyota Corolla Cross Hybrid, Camry Hybrid, Prius rất tiết kiệm nhiên liệu, chỉ từ 4-5L/100km.",
    "toyota có xe nào mạnh mẽ để đi off-road không?": "Toyota Land Cruiser, Toyota Hilux, Toyota Fortuner và Toyota Tacoma là những mẫu xe off-road mạnh mẽ, phù hợp địa hình khó khăn.",
    "toyota có xe nào sang trọng không?": "Toyota Crown, Toyota Alphard, Toyota Land Cruiser là những mẫu xe cao cấp, sang trọng với nội thất đẳng cấp.",
    "toyota có xe nào chạy đường dài tốt không?": "Toyota Camry, Toyota Fortuner, Toyota Land Cruiser là những mẫu xe lý tưởng để chạy đường dài nhờ động cơ mạnh mẽ và êm ái.",
    "toyota có xe nào phù hợp cho doanh nhân không?": "Toyota Camry, Toyota Crown, Toyota Alphard là những mẫu xe sang trọng, phù hợp doanh nhân với thiết kế đẳng cấp và tiện nghi cao cấp.",
    "toyota có xe nào phổ biến nhất không?": "Toyota Vios, Toyota Corolla Altis, Toyota Camry và Toyota Fortuner là những mẫu xe bán chạy nhất của Toyota tại Việt Nam.",
    "toyota có xe hybrid nào giá rẻ không?": "Toyota Corolla Cross Hybrid là mẫu xe hybrid có giá dễ tiếp cận nhất, chỉ khoảng 900 triệu đồng.",
    "toyota có bao nhiêu năm kinh nghiệm sản xuất xe?": "Toyota được thành lập năm 1937, tức là hãng đã có hơn 85 năm kinh nghiệm sản xuất ô tô.",
    "toyota có sản xuất xe tải không?": "Có, Toyota sản xuất một số dòng xe tải nhỏ và bán tải như Hilux, Tacoma, Tundra.",
    "toyota có xe nào nhập khẩu không?": "Có, nhiều mẫu xe như Toyota Land Cruiser, Toyota Prado, Toyota Alphard, Toyota Supra được nhập khẩu nguyên chiếc.",
    "toyota có nhà máy tại Việt Nam không?": "Có, Toyota có nhà máy lắp ráp tại Vĩnh Phúc, sản xuất các dòng xe như Vios, Innova, Fortuner lắp ráp trong nước.",
    "toyota có xe nào phù hợp chạy Uber/Grab không?": "Toyota Vios, Toyota Corolla Altis, Toyota Avanza và Toyota Innova là những mẫu xe phổ biến chạy Uber/Grab.",
    "toyota có xe nào dành cho người thích tốc độ không?": "Toyota GR Supra, Toyota GR 86, Toyota GR Yaris là những mẫu xe dành cho người đam mê tốc độ.",
    "toyota có xe nào dùng động cơ V6 không?": "Toyota Land Cruiser, Toyota Highlander, Toyota Avalon có động cơ V6 mạnh mẽ.",
    "toyota có bảo hành bao lâu?": "Toyota thường bảo hành xe mới từ 3 đến 5 năm hoặc 100.000 km, tùy theo từng thị trường.",
    "toyota có dịch vụ bảo dưỡng tốt không?": "Toyota có hệ thống bảo dưỡng và dịch vụ hậu mãi chuyên nghiệp, với các trung tâm bảo hành trên toàn quốc.",
    "toyota có xe nào phù hợp cho người mới lái không?": "Toyota Vios, Toyota Yaris, Toyota Corolla là những mẫu xe dễ lái, an toàn, phù hợp người mới lái.",
    "toyota có những màu xe phổ biến nào?": "Toyota cung cấp nhiều màu xe phổ biến như Trắng, Đen, Bạc, Đỏ, Xanh, Vàng cát, tùy dòng xe.",
    "toyota có phiên bản xe nào dành riêng cho thị trường Việt Nam không?": "Có, một số mẫu xe như Toyota Vios, Toyota Innova được điều chỉnh để phù hợp với điều kiện đường sá Việt Nam.",
    "toyota có xe nào chạy dầu diesel không?": "Có, Toyota Fortuner Diesel, Toyota Hilux Diesel, Toyota Land Cruiser Diesel sử dụng động cơ dầu tiết kiệm nhiên liệu.",
    "toyota có xe nào có màn hình giải trí lớn không?": "Các mẫu như Toyota Camry, Toyota Fortuner, Toyota Highlander có màn hình giải trí lớn từ 9-12 inch.",
    "toyota có xe nào giá dưới 500 triệu không?": "Có, Toyota Wigo, Toyota Aygo là những mẫu xe giá rẻ dưới 500 triệu.",
    "toyota có xe nào có ghế massage không?": "Toyota Alphard, Toyota Land Cruiser có ghế massage cao cấp.",
    "toyota có xe nào dùng động cơ Turbo không?": "Toyota Corolla Cross 1.6 Turbo, Toyota Highlander 2.4 Turbo là các mẫu xe sử dụng động cơ Turbo.",
    "toyota có xe nào có cửa sổ trời không?": "Toyota Camry, Toyota Fortuner, Toyota Highlander có tùy chọn cửa sổ trời.",
    "toyota có xe nào có hệ thống an toàn TSS không?": "Hầu hết các dòng xe mới của Toyota như Corolla Cross, Camry, Fortuner đều trang bị Toyota Safety Sense (TSS).",
    "toyota": "Toyota là một trong những hãng xe lớn nhất thế giới đến từ Nhật Bản, nổi tiếng với độ bền, tiết kiệm nhiên liệu và nhiều dòng xe phù hợp với nhu cầu khác nhau. Hiện tại, Toyota có các mẫu xe phổ biến như Toyota Vios, Toyota Camry, Toyota Corolla Cross, Toyota Fortuner, Toyota Innova... với giá dao động từ 400 triệu đến hơn 4 tỷ đồng. Nếu bạn quan tâm đến một mẫu xe cụ thể, vui lòng cho biết thêm nhu cầu của bạn để nhận tư vấn chi tiết hơn!",
    "Tôi muốn mua một chiếc xe Toyota giá rẻ, có mẫu nào không?": "N18-AUTO xin giới thiệu Toyota Vios – mẫu sedan giá rẻ nhưng vẫn đảm bảo chất lượng và tiện nghi. Xe có giá dao động từ 500 - 700 triệu VNĐ, tiết kiệm nhiên liệu và phù hợp để đi lại hàng ngày.",
    "toyota camry có những phiên bản nào?": "Toyota Camry hiện có các phiên bản như 2.0G, 2.5Q và 2.5HV, mỗi phiên bản có trang bị khác nhau về động cơ, tiện nghi và công nghệ. N18-AUTO có sẵn các mẫu Camry với giá từ 1,1 - 1,5 tỷ VNĐ, mời quý khách qua showroom để trải nghiệm thực tế.",
    "toyota fortuner có phải là xe 7 chỗ không?": "Đúng vậy! Toyota Fortuner là mẫu SUV 7 chỗ mạnh mẽ, phù hợp cho gia đình và cả công việc. Xe có các phiên bản máy dầu, máy xăng và cả bản Legender cao cấp. N18-AUTO hiện có nhiều chương trình ưu đãi cho dòng xe này.",
    "tôi cần một chiếc xe hybrid của coyota, có mẫu nào không?": "Toyota có nhiều mẫu xe hybrid nổi bật như Toyota Corolla Cross Hybrid, Toyota Camry Hybrid, Toyota Prius… Những mẫu xe này tiết kiệm nhiên liệu đáng kể và thân thiện với môi trường. N18-AUTO cam kết mang đến giá tốt nhất và chính sách hậu mãi hấp dẫn.",
    "toyota land cruiser có giá bao nhiêu?": "Toyota Land Cruiser là mẫu SUV cao cấp với khả năng off-road tuyệt vời, nội thất sang trọng và động cơ mạnh mẽ. Giá xe hiện dao động từ 4 - 5,2 tỷ VNĐ. N18-AUTO cung cấp đầy đủ các phiên bản cùng nhiều ưu đãi khi mua xe.",
    "toyota corolla cross có phải là xe gầm cao không?": "Đúng vậy! Toyota Corolla Cross là mẫu xe crossover gầm cao với thiết kế hiện đại, rộng rãi và nhiều tính năng an toàn. Giá xe từ 755 triệu VNĐ. Hãy ghé N18-AUTO để lái thử và nhận tư vấn chi tiết nhé!",
    "tôi đang tìm một chiếc xe bán tải của Toyota, có mẫu nào không?": "Toyota Hilux chính là lựa chọn lý tưởng cho bạn! Đây là mẫu bán tải mạnh mẽ, bền bỉ, phù hợp cho công việc và cả đi đường dài. Giá xe từ 852 triệu VNĐ. N18-AUTO có sẵn các phiên bản mới nhất để khách hàng tham khảo.",
    "toyota Alphard có phải xe sang không?": "Toyota Alphard là mẫu MPV cao cấp bậc nhất của Toyota, với không gian nội thất xa hoa, tiện nghi như khoang hạng nhất trên máy bay. Xe có giá khoảng 4,3 tỷ VNĐ. N18-AUTO có sẵn các mẫu Alphard cho khách hàng trải nghiệm.",
    "xe nào của toyota phù hợp để chạy dịch vụ?": "Nếu bạn muốn mua xe chạy dịch vụ, Toyota Vios, Toyota Innova hoặc Toyota Avanza Premio là những lựa chọn phù hợp với chi phí vận hành thấp và độ bền cao. N18-AUTO có sẵn xe với nhiều ưu đãi hấp dẫn cho khách hàng kinh doanh.",
    "tôi cần một chiếc xe 7 chỗ của toyota, có mẫu nào?": "Toyota có nhiều dòng xe 7 chỗ như Toyota Fortuner, Toyota Innova, Toyota Land Cruiser Prado và Toyota Alphard. Tuỳ vào nhu cầu và ngân sách, N18-AUTO sẽ tư vấn mẫu xe phù hợp nhất cho bạn.",
    "thông tin về anh huy auto" : "N18-AUTO là doanh nghiệp chuyên kinh doanh các dòng xe ô tô Toyota cao cấp tại Việt Nam. Được thành lập vào năm 2024 với vốn đầu tư 100 tỷ đồng, công ty đặt trụ sở tại 123 Nguyễn Trãi, Thanh Xuân, Hà Nội.Với tầm nhìn trở thành đơn vị hàng đầu trong lĩnh vực phân phối xe Toyota, N18-AUTO cam kết mang đến cho khách hàng những dòng xe chất lượng cao, dịch vụ chuyên nghiệp và chế độ hậu mãi tốt nhất.Ban lãnh đạo công ty gồm: Tổng Giám đốc: Dương Minh Vương, Trợ lý Giám đốc: Lưu Công Hải, N18-AUTO không chỉ cung cấp các mẫu xe mới nhất mà còn tích hợp hệ thống tư vấn thông minh, hỗ trợ khách hàng lựa chọn xe phù hợp với nhu cầu và ngân sách. Đến với N18-AUTO, quý khách sẽ được trải nghiệm dịch vụ tốt nhất từ khi mua xe đến bảo dưỡng sau bán hàng.",
    "ai là chủ" : "Tổng Giám đốc Dương Minh Vương – Lãnh đạo tài ba của N18-AUTO .Anh Dương Minh Vương không chỉ là một doanh nhân thành đạt mà còn là một người lãnh đạo tài giỏi, đầy nhiệt huyết trong ngành kinh doanh ô tô. Với tư duy nhạy bén và chiến lược phát triển đột phá, anh đã dẫn dắt N18-AUTO trở thành một trong những doanh nghiệp hàng đầu trong lĩnh vực phân phối xe Toyota tại Việt Nam. Không chỉ sở hữu ngoại hình điển trai, phong thái lịch lãm, anh còn có sự am hiểu sâu sắc về thị trường ô tô, luôn cập nhật xu hướng mới nhất để mang đến cho khách hàng những lựa chọn tối ưu nhất. Dưới sự dẫn dắt của anh, N18-AUTO không ngừng đổi mới, áp dụng công nghệ hiện đại và nâng cao chất lượng dịch vụ, giúp khách hàng có trải nghiệm mua sắm tốt nhất. Với tầm nhìn dài hạn và chiến lược phát triển bền vững, anh Dương Minh Vương không chỉ xây dựng một doanh nghiệp thành công mà còn truyền cảm hứng cho đội ngũ nhân viên và đối tác.Khách hàng là trọng tâm – Chất lượng là cam kết chính là kim chỉ nam mà anh luôn hướng tới trong sự nghiệp của mình.",
    "anh huy auto có showroom ở đâu" : "N18-AUTO hiện có showroom tại 123 Nguyễn Trãi, Thanh Xuân, Hà Nội. Đây là điểm đến lý tưởng cho khách hàng tìm hiểu và trải nghiệm các dòng xe Toyota mới nhất. Với không gian rộng rãi, thoáng đãng và đội ngũ nhân viên chuyên nghiệp, N18-AUTO cam kết mang đến cho khách hàng trải nghiệm mua sắm tốt nhất.",
    "anh huy auto có chính sách bảo hành như thế nào" : "N18-AUTO cam kết bảo hành xe Toyota mới từ 3 đến 5 năm hoặc 100.000 km tùy theo từng dòng xe. Ngoài ra, chúng tôi còn cung cấp các gói bảo dưỡng định kỳ, sửa chữa chuyên nghiệp và nhanh chóng để đảm bảo xe luôn hoạt động ổn định và an toàn.",
    "anh huy auto có chính sách hậu mãi như thế nào" : "N18-AUTO luôn đặt khách hàng lên hàng đầu, chúng tôi cam kết mang đến dịch vụ hậu mãi tốt nhất cho khách hàng. Sau khi mua xe, quý khách sẽ được hướng dẫn sử dụng, bảo dưỡng định kỳ và hỗ trợ kỹ thuật nhanh chóng. Ngoài ra, chúng tôi còn có các chương trình ưu đãi, khuyến mãi hấp dẫn cho khách hàng thân thiết.",
    "anh huy auto có chính sách trả góp không" : "N18-AUTO hỗ trợ khách hàng vay vốn mua xe với lãi suất ưu đãi, thủ tục nhanh chóng và linh hoạt. Chúng tôi cung cấp nhiều gói vay vốn phù hợp với nhu cầu và khả năng tài chính của khách hàng. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách đổi trả xe không" : "N18-AUTO cam kết đổi trả xe trong vòng 7 ngày nếu khách hàng không hài lòng với sản phẩm. Quý khách sẽ được hoàn lại toàn bộ số tiền đã thanh toán mà không mất bất kỳ khoản phí nào. Đây là cam kết của chúng tôi đối với sự hài lòng của khách hàng.",
    "anh huy auto có chính sách giảm giá không" : "N18-AUTO thường xuyên có các chương trình khuyến mãi, giảm giá hấp dẫn cho khách hàng mua xe mới. Quý khách có thể tham khảo thông tin chi tiết trên website hoặc liên hệ trực tiếp với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách đổi xe cũ lấy xe mới không" : "N18-AUTO chấp nhận đổi xe cũ lấy xe mới với giá hợp lý và thủ tục nhanh chóng. Chúng tôi cam kết định giá công bằng và hỗ trợ khách hàng mua xe mới một cách thuận lợi nhất. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách hỗ trợ đăng ký, đăng kiểm không" : "N18-AUTO hỗ trợ khách hàng đăng ký, đăng kiểm xe nhanh chóng và thuận tiện. Chúng tôi sẽ hướng dẫn khách hàng từng bước để hoàn tất thủ tục một cách dễ dàng nhất. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "các dòng xe bán chạy nhất tại anh huy auto" : "Tại N18-AUTO, các dòng xe Toyota bán chạy nhất luôn thu hút khách hàng nhờ độ bền bỉ, tiết kiệm nhiên liệu và công nghệ tiên tiến. Đầu tiên là Toyota Vios 2025, mẫu sedan quốc dân với thiết kế hiện đại, động cơ 1.5L tiết kiệm nhiên liệu chỉ 5.5L/100km, nội thất rộng rãi và hệ thống an toàn Toyota Safety Sense, mức giá chỉ từ 520 triệu VNĐ. Tiếp theo là Toyota Corolla Cross, mẫu SUV đô thị được trang bị động cơ hybrid giúp giảm tiêu hao nhiên liệu, màn hình giải trí 9 inch, cốp điện cảm biến và hệ thống cảnh báo va chạm, giá từ 910 triệu VNĐ. Nếu bạn cần một mẫu xe gia đình rộng rãi, Toyota Innova 2025 với 7 chỗ ngồi, động cơ 2.0L mạnh mẽ, hộp số CVT mượt mà và khoang cabin rộng rãi sẽ là lựa chọn hoàn hảo với giá từ 860 triệu VNĐ. Đối với những ai đam mê địa hình, Toyota Fortuner Legender mang đến sự mạnh mẽ với động cơ 2.8L Diesel, hệ dẫn động 4WD, nội thất sang trọng và hàng loạt công nghệ hỗ trợ lái, giá từ 1.3 tỷ VNĐ. Cuối cùng, Toyota Hilux 2025 là mẫu bán tải bền bỉ, trang bị động cơ Diesel 2.4L hoặc 2.8L, khả năng vận hành mạnh mẽ trên mọi địa hình, hệ thống treo chắc chắn và cabin tiện nghi, mức giá từ 870 triệu VNĐ. Tất cả các dòng xe trên đều được khách hàng tin tưởng nhờ sự bền bỉ, tiết kiệm và khả năng giữ giá cao. Nếu bạn đang tìm một chiếc Toyota phù hợp, N18-AUTO luôn sẵn sàng tư vấn chi tiết để giúp bạn lựa chọn chiếc xe ưng ý nhất!",
    "anh huy auto có chính sách giảm giá cho doanh nghiệp không" : "N18-AUTO luôn hỗ trợ doanh nghiệp mua xe với giá ưu đãi, chính sách hậu mãi tốt và dịch vụ chuyên nghiệp. Chúng tôi cam kết mang đến giải pháp vận tải hiệu quả và tiết kiệm chi phí cho doanh nghiệp. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách giảm giá cho khách hàng thân thiết không" : "N18-AUTO luôn đặt khách hàng lên hàng đầu, chúng tôi có chính sách ưu đãi đặc biệt cho khách hàng thân thiết. Nếu bạn đã mua xe tại N18-AUTO, hãy liên hệ với chúng tôi để nhận ưu đãi hấp dẫn và quà tặng đặc biệt.",
    "anh huy auto có chính sách giảm giá cho người mua xe lần đầu không" : "N18-AUTO luôn đón chào khách hàng mới, chúng tôi có chính sách giảm giá đặc biệt cho người mua xe lần đầu. Hãy liên hệ với chúng tôi để biết thêm chi tiết và nhận ưu đãi hấp dẫn.",
    "anh huy auto có chính sách giảm giá cho người mua xe số lượng lớn không" : "N18-AUTO luôn hỗ trợ khách hàng mua xe số lượng lớn với giá ưu đãi, chính sách hậu mãi tốt và dịch vụ chuyên nghiệp. Chúng tôi cam kết mang đến giải pháp vận tải hiệu quả và tiết kiệm chi phí cho doanh nghiệp. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách giảm giá cho người mua xe trả góp không" : "N18-AUTO luôn hỗ trợ khách hàng mua xe trả góp với giá ưu đãi, lãi suất thấp và thủ tục nhanh chóng. Chúng tôi cam kết mang đến giải pháp vận tải hiệu quả và tiết kiệm chi phí cho khách hàng. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "anh huy auto có chính sách giảm giá cho người mua xe sớm không" : "N18-AUTO luôn đón chào khách hàng mua xe sớm, chúng tôi có chính sách giảm giá đặc biệt cho người mua xe trước thời hạn. Hãy liên hệ với chúng tôi để biết thêm chi tiết và nhận ưu đãi hấp dẫn.",  
    "anh huy auto có chính sách giảm giá cho người mua xe trả trước không" : "N18-AUTO luôn đón chào khách hàng mua xe trả trước, chúng tôi có chính sách giảm giá đặc biệt cho người mua xe trả trước. Hãy liên hệ với chúng tôi để biết thêm chi tiết và nhận ưu đãi hấp dẫn.",
    "anh huy auto có chính sách giảm giá cho người mua xe qua mạng không" : "N18-AUTO luôn hỗ trợ khách hàng mua xe qua mạng với giá ưu đãi, chính sách hậu mãi tốt và dịch vụ chuyên nghiệp. Chúng tôi cam kết mang đến giải pháp vận tải hiệu quả và tiết kiệm chi phí cho khách hàng. Hãy liên hệ với chúng tôi để biết thêm chi tiết.",
    "duong minh vuong có đẳng cấp không" : "Quá đẳng cấp là quá đẳng cấp ^^",
    "duong minh vuong có lịch lãm không" : "Quá lịch lãm là quá lịch lãm ^^",
    "duong minh vuong có điển trai không" : "Quá điển trai là quá điển trai ^^",
    "duong minh vuong có tài giỏi không" : "Quá tài giỏi là quá tài giỏi ^^",
    "duong minh vuong có nhiệt huyết không" : "Quá nhiệt huyết là quá nhiệt huyết ^^",
    "duong minh vuong có am hiểu không" : "Quá am hiểu là quá am hiểu ^^",
    "duong minh vuong có cập nhật không" : "Quá cập nhật là quá cập nhật ^^",
    "duong minh vuong có truyền cảm hứng không" : "Quá truyền cảm hứng là quá truyền cảm hứng ^^",
    "duong minh vuong có xây dựng không" : "Quá xây dựng là quá xây dựng ^^",
    "duong minh vuong có doanh nghiệp không" : "Quá doanh nghiệp là quá doanh nghiệp ^^",
    "duong minh vuong có thành công không" : "Quá thành công là quá thành công ^^",
    "duong minh vuong có truyền thông không" : "Quá truyền thông là quá truyền thông ^^",
    "duong minh vuong có chiến lược không" : "Quá chiến lược là quá chiến lược ^^",
    "duong minh vuong có phát triển không" : "Quá phát triển là quá phát triển ^^",
    "duong minh vuong có bền vững không" : "Quá bền vững là quá bền vững ^^",
    "hello" : "Xin chào! Tôi có thể giúp gì cho bạn?",
    "hi" : "Xin chào! Tôi có thể giúp gì cho bạn?",
    "chào" : "Xin chào! Tôi có thể giúp gì cho bạn?",
    "chào bạn" : "Xin chào! Tôi có thể giúp gì cho bạn?",
    "bạn là ai" : "Tôi là chatbot của N18-AUTO, được lập trình để hỗ trợ khách hàng tìm hiểu thông tin về các dòng xe Toyota và chính sách bán hàng của công ty.",
    "bạn tên gì" : "Mình là chatbot của N18-AUTO, bạn có thể gọi mình là Anh Huy.",
    "cảm ơn" : "Không có gì, nếu cần thêm thông tin gì, bạn hãy nói cho mình biết nhé!",
    "tạm biệt" : "Chào tạm biệt, hẹn gặp lại bạn sau!",
    "hẹn gặp lại" : "Hẹn gặp lại bạn sau nhé!",
    "tôi muốn mua xe" : "Bạn quan tâm đến dòng xe nào? Mình có thể tư vấn giúp bạn.",
    "tôi muốn biết thông tin về dòng xe" : "Dòng xe bạn quan tâm là gì? Mình sẽ cung cấp thông tin chi tiết cho bạn.",
    "tôi muốn biết thông tin về chính sách bán hàng" : "Bạn quan tâm đến chính sách nào? Mình sẽ giúp bạn tìm hiểu chi tiết.",
    "tôi muốn biết thông tin về showroom" : "Bạn muốn biết thông tin về showroom ở đâu? Mình sẽ hướng dẫn cho bạn.",
    "tôi muốn biết thông tin về chủ công ty" : "Bạn muốn biết thông tin về chủ công ty? Mình sẽ giới thiệu cho bạn.",
    "bạn được ai tạo ra" : "Mình được lập trình bởi Developer Dương Minh Vương - Founder N18-AUTO để hỗ trợ khách hàng tìm hiểu thông tin về các dòng xe Toyota và chính sách bán hàng của công ty.",
    "bạn có thể giúp gì" : "Mình có thể giúp bạn tìm hiểu thông tin về các dòng xe Toyota, chính sách bán hàng của N18-AUTO và giải đáp các thắc mắc của bạn.",
    "bạn là chatbot" : "Đúng vậy, mình là chatbot của N18-AUTO, được lập trình để hỗ trợ khách hàng tìm hiểu thông tin về các dòng xe Toyota và chính sách bán hàng của công ty.",
    "bạn có thể tư vấn cho tôi không" : "Tất nhiên, mình sẽ cố gắng tư vấn cho bạn một cách tốt nhất.",
    "bạn có thể giúp tôi chọn xe không" : "Tất nhiên, mình sẽ cố gắng giúp bạn chọn được chiếc xe phù hợp với nhu cầu và ngân sách của bạn.",
    "bạn có thể giúp tôi mua xe không" : "Tất nhiên, mình sẽ cố gắng giúp bạn mua được chiếc xe ưng ý nhất.",   
    "bạn có thể giúp tôi đặt lịch hẹn không" : "Tất nhiên, mình sẽ cố gắng giúp bạn đặt lịch hẹn một cách thuận tiện nhất.",
    "bạn có thể giúp tôi tìm showroom không" : "Tất nhiên, mình sẽ cố gắng giúp bạn tìm showroom gần nhất.",
    "bạn có thể giúp tôi tìm chủ công ty không" : "Tất nhiên, mình sẽ cố gắng giúp bạn tìm thông tin về chủ công ty.",
    "bạn có thể giúp tôi tìm thông tin không" : "Tất nhiên, mình sẽ cố gắng giúp bạn tìm thông tin bạn cần.",
    "bạn có thể giúp tôi tìm chính sách không" : "Tất nhiên, mình sẽ cố gắng giúp bạn tìm chính sách bạn quan tâm.",
    "bạn có thể giúp tôi tìm giá không" : "Tất nhiên, mình sẽ cố gắng giúp bạn tìm giá xe bạn quan tâm.",
    "jack là ai ?" : "nó là thằng bỏ con 💁🏻",
    "viruss là ai ?" : "nó là thằng bỏ con 💁🏻",
    "viruss" : "nó là thằng bỏ con 💁🏻",
    "jack" : "nó là thằng bỏ con 💁🏻",
    "nếu chọn giữa sơn tùng và jack thì bạn chọn ai" : "em chọn anh 😘😘",
    "nếu chọn giữa sơn tùng và viruss thì bạn chọn ai" : "em chọn anh 😘😘",
    "mvd là ai": "Dương Minh Vương là một lập trình viên tài năng và đẹp trai, người đứng sau sự phát triển của AI Chatbot N18-AUTO – một trợ lý ảo thông minh giúp khách hàng tìm kiếm và lựa chọn xe phù hợp theo ngân sách và nhu cầu cá nhân. Với kiến thức sâu rộng về JavaScript, Node.js và AI/ML, anh đã ứng dụng công nghệ xử lý ngôn ngữ tự nhiên (NLP) để tạo ra một chatbot có khả năng tư vấn xe như một chuyên gia thực thụ, đồng thời giải đáp nhanh chóng mọi thắc mắc liên quan đến ô tô. Sự nhạy bén với công nghệ, khả năng tối ưu thuật toán và tinh thần sáng tạo không ngừng đã giúp Vương xây dựng một sản phẩm mang lại trải nghiệm mượt mà cho người dùng. Không chỉ giỏi chuyên môn, anh còn được đồng nghiệp đánh giá cao bởi sự chăm chỉ, nhiệt huyết và phong cách làm việc chuyên nghiệp. Với đà phát triển này, chắc chắn Dương Minh Vương sẽ còn tạo ra nhiều sản phẩm công nghệ đột phá trong tương lai.",
    "mvd có đẳng cấp ko?": "Quá đẳng cấp là quá đẳng cấp😘😘 ",
    "vn là gì" : "Nước Cộng Hoà Xã Hội Chủ Nghĩa Việt Nam muôn năm🇻🇳 - Đảng Cộng Sản Việt Nam muôn năm 🇻🇳",
    "em tên gì ?" : "Em tên Nhung xăm family trên lưng",
    "họ gọi anh là cờ đỏ" : "Cờ đỏ sao vàng anh ơi 🇻🇳",
    "bộ máy anh huy auto" : "Bộ máy N18-AUTO bao gồm Tổng Giám đốc: Dương Minh Vương, Trợ lý Giám đốc: Lưu Công Hải, Phó giám đốc: Nguyễn Hữu Trọng Anh - Nguyễn Đức Dũng, Lễ tân: Nguyễn Đức Việt, Trưởng phòng Marketing: Lưu Công Hải. Mỗi thành viên đều có chuyên môn cao và tâm huyết với công việc.",
    "tuyển dụng" : "Nếu bạn có đam mê về ô tô hay muốn tìm kiếm việc làm hãy về đội chúng tôi, mọi thắc mắc xin liên hệ lễ tân Nguyễn Đức Việt",
    "giảng viên nhập môn cnpm" : "Giảng viên môn học này là thầy Nguyễn Đức Anh, một giảng viên có chuyên môn cao và nhiệt huyết trong việc giảng dạy. Thầy luôn sẵn sàng hỗ trợ sinh viên trong quá trình học tập và nghiên cứu.",
    "tôi muốn tìm dòng xe toyota giá 1 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1 tỷ như Toyota Corolla Cross, Toyota Fortuner, Toyota Innova và Toyota Hilux. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 500 triệu" : "Toyota Vios là mẫu xe sedan giá rẻ nhất của Toyota, với mức giá khoảng 520 triệu VNĐ. Đây là lựa chọn lý tưởng cho những ai đang tìm kiếm một chiếc xe tiết kiệm nhiên liệu và chi phí vận hành thấp. N18-AUTO có sẵn xe để khách hàng tham khảo.",
    "tôi muốn tìm dòng xe toyota giá 2 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 2 tỷ như Toyota Land Cruiser Prado, Toyota Fortuner và Toyota Alphard. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 800 triệu" : "Toyota có nhiều dòng xe trong khoảng giá 800 triệu như Toyota Corolla Cross, Toyota Innova và Toyota Hilux. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.5 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.5 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.2 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.2 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.8 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.8 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.3 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.3 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.4 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.4 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.6 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.6 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.7 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.7 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 1.9 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 1.9 tỷ như Toyota Fortuner, Toyota Innova và Toyota Land Cruiser Prado. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 2.5 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 2.5 tỷ như Toyota Land Cruiser Prado, Toyota Fortuner và Toyota Alphard. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
    "tôi muốn tìm dòng xe toyota giá 2.3 tỷ" : "Toyota có nhiều dòng xe trong khoảng giá 2.3 tỷ như Toyota Land Cruiser Prado, Toyota Fortuner và Toyota Alphard. Tùy vào nhu cầu sử dụng và sở thích cá nhân, bạn có thể lựa chọn mẫu xe phù hợp nhất. N18-AUTO luôn sẵn sàng tư vấn chi tiết cho bạn.",
}
const createMessageElement = (content, classes) => {
    const div = document.createElement('div');
    div.classList.add("message", classes);
    div.innerHTML = content;
    return div; 
}

let isProcessingMessage = false;

const handleOutgoingMessage = (e) => {

    if (isProcessingMessage) return; 
    e.preventDefault();
    userData.message = messageInput.value.trim().toLowerCase();

    if (!userData.message) return;

    const messageContent = `<div class="message-text">${userData.message}</div>`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    chatBody.appendChild(outgoingMessageDiv);
    messageInput.value = '';

    setTimeout(() => handleIncomingMessage(userData.message), 1000); 
}

// const handleOutgoingMessage = (e) => {
//     if (isProcessingMessage) return; // Ngăn gửi nhiều lần
//     e.preventDefault();

//     userData.message = messageInput.value.trim().toLowerCase();
//     if (!userData.message) return;

//     const messageContent = `<div class="message-text">${userData.message}</div>`;
//     const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
//     chatBody.appendChild(outgoingMessageDiv);
//     messageInput.value = '';

//     isProcessingMessage = true; 
//     setTimeout(() => {
//         handleIncomingMessage(userData.message);
//     }, 1000); 
// }


const handleIncomingMessage = (userMessage) => {
    let botMessageContent = "Xin lỗi, tôi không hiểu câu hỏi của bạn.";

    // Normalize user message to avoid repetitive responses
    const normalizedMessage = userMessage.toLowerCase().trim();

    for (const [key, value] of Object.entries(botResponses)) {
        if (normalizedMessage.includes(key)) {
            botMessageContent = `<div class="message-text">${value}</div>`;
            break;
        }
    }

    // Prevent duplicate bot responses for the same user message
    const lastBotMessage = chatBody.querySelector('.bot-message:last-child .message-text');
    if (lastBotMessage && lastBotMessage.innerHTML === botMessageContent) {
        return; // Skip if the last bot response is identical
    }

    const incomingMessageDiv = createMessageElement(botMessageContent, "bot-message");
    chatBody.appendChild(incomingMessageDiv);
    chatBody.scrollTop = chatBody.scrollHeight; 
}

// Enter key event
messageInput.addEventListener('keydown', (e) => {
    const userMessage = e.target.value.trim();
    if (e.key === "Enter" && userMessage) {
        handleOutgoingMessage(e);
    }
});

sendMessageButton.addEventListener('click', (e) => handleOutgoingMessage(e));


